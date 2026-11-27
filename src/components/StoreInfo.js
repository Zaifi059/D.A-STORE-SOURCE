/**
 * Store contact details come from environment variables. Only values that are
 * set are returned, so the site never shows placeholder details.
 */
export function getStoreInfo() {
  const env = import.meta.env;
  return [
    { label: 'Email', value: env.VITE_STORE_EMAIL, href: env.VITE_STORE_EMAIL && `mailto:${env.VITE_STORE_EMAIL}` },
    { label: 'Phone', value: env.VITE_STORE_PHONE, href: env.VITE_STORE_PHONE && `tel:${env.VITE_STORE_PHONE.replace(/\s+/g, '')}` },
    { label: 'Showroom', value: env.VITE_STORE_ADDRESS },
    { label: 'Hours', value: env.VITE_STORE_HOURS },
  ].filter((i) => i.value);
}
