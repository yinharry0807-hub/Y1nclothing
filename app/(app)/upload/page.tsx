import { UploadDropzone } from "@/components/UploadDropzone";

export const metadata = { title: "资料导入 - 服装跟单智能工作台" };

export default function UploadPage() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">资料导入</h1>
        <p className="mt-1 text-sm text-slate-500">
          批量上传 Excel / Word / PDF / 图片，自动解析全文、保存原文件，随时可查可搜。
        </p>
      </div>
      <UploadDropzone />
    </div>
  );
}
