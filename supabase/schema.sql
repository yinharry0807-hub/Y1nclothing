-- =====================================================================
-- 服装跟单智能工作台 - Supabase 数据库初始化脚本
-- 使用方法：Supabase 控制台 -> SQL Editor -> 粘贴本文件全部内容 -> Run
-- 说明：所有增删改都会自动写入 audit_log（数据库触发器实现，无法绕过）
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------
-- 1. 审计日志表（先建，触发器依赖它）
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,                                   -- 被操作的表
  record_id   text not null,                                   -- 记录主键
  action      text not null check (action in ('INSERT','UPDATE','DELETE')),
  old_data    jsonb,                                           -- 修改前完整快照
  new_data    jsonb,                                           -- 修改后完整快照
  changed_by  uuid references auth.users(id) on delete set null,
  changed_at  timestamptz not null default now()
);

comment on table public.audit_log is '操作日志：所有增删改自动记录新旧版本，支持回看与恢复';
create index if not exists audit_log_changed_at_idx on public.audit_log (changed_at desc);
create index if not exists audit_log_record_idx on public.audit_log (table_name, record_id);

-- ---------------------------------------------------------------------
-- 2. 通用触发器函数：updated_at 自动更新 + 审计记录
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.record_audit()
returns trigger language plpgsql security definer as $$
declare
  v_record_id text;
begin
  v_record_id := coalesce(new.id::text, old.id::text);
  insert into public.audit_log (table_name, record_id, action, old_data, new_data, changed_by)
  values (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    auth.uid()
  );
  return coalesce(new, old);
end $$;

-- 3.0 app_settings：应用设置（如视觉模型切换），云端同步、多设备一致
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

comment on table public.app_settings is '应用设置：key-value，设置页的模型选择等云端同步';

-- ---------------------------------------------------------------------
-- 3. 业务表
-- ---------------------------------------------------------------------

-- 3.1 documents：上传的原始文件（原文永远保存，AI 总结绝不覆盖）
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  file_name     text not null,
  file_type     text not null,          -- xlsx/xls/docx/doc/pdf/png/jpg/jpeg/webp...
  file_size     bigint,
  original_text text,                   -- 解析出的原文全文
  storage_path  text,                   -- Supabase Storage 对象路径（私有桶）
  file_url      text,                   -- 预留：公网链接（私有桶下为空，用签名 URL 下载）
  status        text not null default 'parsed'
                check (status in ('parsed','vision_pending','failed')),
  parse_error   text,                   -- 解析失败原因
  source_path   text,                   -- 本地批量导入时的原始路径（用于去重）
  upload_time   timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null
);

comment on table public.documents is '原始资料库：Excel/Word/PDF/图片解析后的原文与文件链接';
create index if not exists documents_upload_time_idx on public.documents (upload_time desc);
create index if not exists documents_source_path_idx on public.documents (source_path);
create index if not exists documents_original_text_trgm_idx on public.documents using gin (original_text gin_trgm_ops);
create index if not exists documents_file_name_trgm_idx on public.documents using gin (file_name gin_trgm_ops);

-- 3.2 styles：款式主表
create table if not exists public.styles (
  id               uuid primary key default gen_random_uuid(),
  style_no         text not null unique,            -- 款式编号，如 24N1109PT4233
  style_name       text,                             -- 款式名称/品名，如 高腰直筒针织牛仔裤
  customer_style_no text,                            -- 客户款号
  brand            text default 'Halara',
  customer         text default '全速',
  category         text,                             -- 品类：牛仔裤/针织裤/短裤...
  image_url        text,                             -- 款式图（阶段3支持图片上传）
  status           text not null default '打样中'
                   check (status in ('打样中','大货生产','已出货','已停产','暂停')),
  notes            text,
  document_id      uuid references public.documents(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users(id) on delete set null
);

comment on table public.styles is '款式主表：一个款一份档案';
create index if not exists styles_style_no_trgm_idx on public.styles using gin (style_no gin_trgm_ops);
create index if not exists styles_name_trgm_idx on public.styles using gin (style_name gin_trgm_ops);
create index if not exists styles_customer_no_trgm_idx on public.styles using gin (customer_style_no gin_trgm_ops);

-- 3.3 orders：大货单（PO 维度，同一款式不同颜色/不同 PO 是多条订单）
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_no         text,                              -- 制单号，如 6-H4233-001
  po_no            text,                              -- 客户 PO 号，如 1412050
  style_id         uuid not null references public.styles(id) on delete cascade,
  style_no         text,                              -- 冗余款式号，方便检索
  fit              text,                              -- Regular / Petite
  colorway         text,                              -- 颜色，如 黑色-深灰
  order_date       date,
  quantity         integer,                           -- 合同数量（件）
  target_qty       integer,                           -- 目标裁数
  actual_qty       integer,                           -- 实裁数
  unit_price       numeric(10,2),
  delivery_date    date,                              -- 大货交货期
  production_type  text,                              -- 生产方式：本厂 / 外发（XX制衣厂）
  current_progress text,                              -- 当前核心进度
  risk_level       text,                              -- 风险等级：低/中/中高/高
  thread_info      text,                              -- 用线
  fabric_summary   text,                              -- 用布
  size_breakdown   jsonb,                             -- 尺码分布 {"XS":27,"S":50,...}
  status           text not null default '生产中'
                   check (status in ('草稿','生产中','已完成','已取消')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.orders is '大货单：每个 PO/颜色一条，关联款式';
create index if not exists orders_po_no_trgm_idx on public.orders using gin (po_no gin_trgm_ops);
create index if not exists orders_order_no_trgm_idx on public.orders using gin (order_no gin_trgm_ops);
create index if not exists orders_style_id_idx on public.orders (style_id);

-- 3.4 order_milestones：大货生产进度节点（对应大货生产进度追踪表的流程节点）
create table if not exists public.order_milestones (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  node_name   text not null,              -- 大货接单确认/面料调拨/辅料齐套/缩水测试/排唛与开货准备/产前会/裁床完成/头缸制作与洗水/客户批头缸/大货洗水/后整/尾查+尺寸上传/出货/货期校验
  status      text not null default '待开始'
              check (status in ('已完成','进行中','待开始')),
  planned_time text,                      -- 完成/计划时间（自由文本：8/1-8/3）
  note        text,                       -- 跟进说明
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (order_id, node_name)
);

comment on table public.order_milestones is '大货进度节点：每个订单 14 个标准节点，逐步推进';
create index if not exists order_milestones_order_idx on public.order_milestones (order_id, sort_order);

-- 3.5 fabric_info：面料信息（可关联款式，也可精确到某个订单/颜色）
create table if not exists public.fabric_info (
  id               uuid primary key default gen_random_uuid(),
  style_id         uuid not null references public.styles(id) on delete cascade,
  order_id         uuid references public.orders(id) on delete cascade,   -- 可空：面料记录到具体订单
  material_code    text,               -- 物料编码，如 F0101312
  fabric_name      text not null,      -- 面料名称，如 四面弹 / M14219/KST0097-R
  category         text,               -- 主身布/袋布/朴/网布/里布
  composition      text,               -- 成分，如 80%涤 20%棉
  weight           text,               -- 克重
  width            text,               -- 幅宽，如 155cm / 55寸
  usage_per_piece  text,               -- 用量/件，如 0.13 米/件
  unit             text,
  unit_price       numeric(10,2),      -- 单价
  supplier         text,               -- 供应商
  colorway         text,               -- 颜色
  shrinkage_warp   text,               -- 经缩率%
  shrinkage_weft   text,               -- 纬缩率%
  loss_rate        text,               -- 损耗%
  position         text,               -- 使用部位
  source           text,               -- 物料来源：采购/调拨/存仓
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.fabric_info is '面料信息：关联款式（可精确到订单）';
create index if not exists fabric_info_style_idx on public.fabric_info (style_id);
create index if not exists fabric_info_order_idx on public.fabric_info (order_id);
create index if not exists fabric_info_name_trgm_idx on public.fabric_info using gin (fabric_name gin_trgm_ops);
create index if not exists fabric_info_supplier_trgm_idx on public.fabric_info using gin (supplier gin_trgm_ops);

-- 3.6 accessory_info：辅料信息 + 追踪状态
create table if not exists public.accessory_info (
  id               uuid primary key default gen_random_uuid(),
  style_id         uuid not null references public.styles(id) on delete cascade,
  order_id         uuid references public.orders(id) on delete cascade,   -- 可空：辅料到具体订单
  material_code    text,               -- 物料编码，如 F14316
  accessory_name   text not null,      -- 辅料名称，如 3#Y牙白铜闭尾弹簧头
  category         text,               -- 用途分类：裁床类/配件类/包装类/做工类
  spec             text,               -- 规格，如 12.5cm*220条 / 15*32mm
  colorway         text,               -- 颜色
  unit             text,               -- PCS/个/米
  usage_per_piece  text,               -- 每件用量/单耗
  quantity         numeric(12,2),      -- 订购数量
  received_qty     numeric(12,2),      -- 收货数量
  unit_price       numeric(10,2),
  supplier         text,               -- 供应商，如 伟强/金泰/中广
  source           text,               -- 提供方式：采购/加工/客供/存仓
  order_date       date,               -- 下单日期
  expected_arrival date,               -- 预计到货日期
  actual_arrival   date,               -- 实际到货日期
  tracking_status  text not null default '未下单'
                   check (tracking_status in ('未下单','已下单','在途','已到货')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.accessory_info is '辅料信息与追踪：未下单/已下单/在途/已到货';
create index if not exists accessory_info_style_idx on public.accessory_info (style_id);
create index if not exists accessory_info_order_idx on public.accessory_info (order_id);
create index if not exists accessory_info_tracking_idx on public.accessory_info (tracking_status);
create index if not exists accessory_info_name_trgm_idx on public.accessory_info using gin (accessory_name gin_trgm_ops);
create index if not exists accessory_info_supplier_trgm_idx on public.accessory_info using gin (supplier gin_trgm_ops);

-- 3.7 preproduction：产前版记录
create table if not exists public.preproduction (
  id          uuid primary key default gen_random_uuid(),
  style_id    uuid not null references public.styles(id) on delete cascade,
  sample_no   text,                -- 样板单号/单据编号，如 6-H2856-002-01
  version     text,                -- 寄出版本：第一次/第二次/第三次...
  colorway    text,
  quantity    integer,
  sample_date date,
  progress    text,                -- 产前版进度：待排期/剪版/车版/试缩水/洗水/寄板/客户批核/通过/返修
  fabric_summary text,             -- 面辅料整理
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.preproduction is '产前版记录：每个款式历次产前版';
create index if not exists preproduction_style_idx on public.preproduction (style_id);

-- 3.8 sample_orders：样板单（开发板/样办单）
create table if not exists public.sample_orders (
  id              uuid primary key default gen_random_uuid(),
  style_id        uuid not null references public.styles(id) on delete cascade,
  sample_order_no text,            -- 单据编号
  sample_type     text,            -- 板类：首版样/复版/产前版/大货仅裁剪
  colorway        text,
  quantity        integer,
  sample_date     date,
  status          text not null default '进行中',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.sample_orders is '样板单：开发办单/样办单记录';
create index if not exists sample_orders_style_idx on public.sample_orders (style_id);

-- 3.9 ai_summaries：AI 总结（结构化 + 原文双重保存）
create table if not exists public.ai_summaries (
  id               uuid primary key default gen_random_uuid(),
  document_id      uuid references public.documents(id) on delete cascade,
  style_id         uuid references public.styles(id) on delete cascade,
  summary_type     text not null check (summary_type in ('document','style')),
  summary_text     text,            -- AI 详细总结
  structured_data  jsonb,           -- 提取的结构化字段（款式/面料/辅料/价格/交期...）
  original_text    text,            -- 生成总结时的原文快照
  model            text,            -- 使用的模型
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.ai_summaries is 'AI 总结：结构化+原文双重保存，总结有偏差时原文永远可查';
create index if not exists ai_summaries_document_idx on public.ai_summaries (document_id);
create index if not exists ai_summaries_style_idx on public.ai_summaries (style_id);
create unique index if not exists ai_summaries_doc_unique on public.ai_summaries (document_id, summary_type)
  where document_id is not null;

-- ---------------------------------------------------------------------
-- 4. 触发器：updated_at + audit_log
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  cols text[];
begin
  foreach t in array array[
    'documents','styles','orders','order_milestones','fabric_info',
    'accessory_info','preproduction','sample_orders','ai_summaries','app_settings'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I;', 'trg_'||t||'_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at();',
                   'trg_'||t||'_updated_at', t);
    execute format('drop trigger if exists %I on public.%I;', 'trg_'||t||'_audit', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.record_audit();',
                   'trg_'||t||'_audit', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. Row Level Security：登录用户可读写业务表；audit_log 只读
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'documents','styles','orders','order_milestones','fabric_info',
    'accessory_info','preproduction','sample_orders','ai_summaries','app_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', 'p_'||t||'_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (true);', 'p_'||t||'_select', t);
    execute format('drop policy if exists %I on public.%I;', 'p_'||t||'_insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (true);', 'p_'||t||'_insert', t);
    execute format('drop policy if exists %I on public.%I;', 'p_'||t||'_update', t);
    execute format('create policy %I on public.%I for update to authenticated using (true) with check (true);', 'p_'||t||'_update', t);
    execute format('drop policy if exists %I on public.%I;', 'p_'||t||'_delete', t);
    execute format('create policy %I on public.%I for delete to authenticated using (true);', 'p_'||t||'_delete', t);
  end loop;
end $$;

alter table public.audit_log enable row level security;
drop policy if exists "audit_log_select" on public.audit_log;
create policy "audit_log_select" on public.audit_log for select to authenticated using (true);
-- audit_log 不开放给用户直接写：写入只能由 record_audit() 触发器（security definer）完成

-- ---------------------------------------------------------------------
-- 6. 存储桶：documents（私有），供上传原始文件
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents_storage_select" on storage.objects;
create policy "documents_storage_select" on storage.objects
  for select to authenticated using (bucket_id = 'documents');

drop policy if exists "documents_storage_insert" on storage.objects;
create policy "documents_storage_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'documents');

drop policy if exists "documents_storage_update" on storage.objects;
create policy "documents_storage_update" on storage.objects
  for update to authenticated using (bucket_id = 'documents') with check (bucket_id = 'documents');

drop policy if exists "documents_storage_delete" on storage.objects;
create policy "documents_storage_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'documents');

-- ---------------------------------------------------------------------
-- 7. 模糊检索辅助函数：按相似度返回款式
-- ---------------------------------------------------------------------
create or replace function public.search_styles(q text)
returns table (id uuid, style_no text, style_name text, customer_style_no text, status text, similarity real)
language sql stable as $$
  select s.id, s.style_no, s.style_name, s.customer_style_no, s.status,
         greatest(
           similarity(s.style_no, q),
           similarity(coalesce(s.style_name,''), q),
           similarity(coalesce(s.customer_style_no,''), q)
         ) as sim
  from public.styles s
  where s.style_no ilike '%' || q || '%'
     or coalesce(s.style_name,'') ilike '%' || q || '%'
     or coalesce(s.customer_style_no,'') ilike '%' || q || '%'
  order by sim desc, s.updated_at desc
  limit 20;
$$;
