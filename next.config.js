/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    },
    // PDFKit reads its own data files from disk, so it must be loaded from
    // node_modules rather than bundled.
    serverComponentsExternalPackages: ['pdfkit', 'svg-to-pdfkit'],
    // The worksheet PDF reads its fonts at runtime; make sure the deployed
    // function ships them.
    outputFileTracingIncludes: {
      '/api/practice/[topicId]/worksheet': ['./lib/practice/fonts/**/*']
    }
  }
};

module.exports = nextConfig;
