/** Public pages live in app/(en) and app/(ar)/ar (components in components/site, copy in content/).
 *  The tool and admin live in app/(app). */
module.exports = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, { key: 'X-Frame-Options', value: 'SAMEORIGIN' }] },
      { source: '/assets/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ]
  },
}
