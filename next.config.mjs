/** @type {import('next').NextConfig} */
const nextConfig = {
  // 这些包在 Node 运行时加载（不打包进服务端 bundle），确保 PDF/.doc 解析在 Vercel 上可用
  serverExternalPackages: ["pdf-parse", "word-extractor"],
  webpack: (config) => {
    // node_modules 通过目录联接指向 D 盘（C 盘空间不足）。
    // 关闭 symlink 解析，让 webpack 按 C 盘目录结构解析模块，避免路径错乱。
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
