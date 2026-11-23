import './globals.css';
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', interactiveWidget: 'resizes-content' };
export const metadata = { title: 'Pllulai Studio', description: 'Create images and videos from one simple prompt.' };
export default function RootLayout({ children }) {
  return (<html lang="en"><body>{children}</body></html>);
}
