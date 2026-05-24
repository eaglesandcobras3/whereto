import Script from "next/script";
import { GOOGLE_MEASUREMENT_ID } from "@/lib/analytics/google-measurement-id";

/**
 * GA4 loader — matches Google’s **`gtag.js`** bootstrap; measurement ID from env or default **`G-781F48KRLR`**.
 */
export function GoogleAnalytics() {
  const id = GOOGLE_MEASUREMENT_ID;
  if (!id) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="google-analytics-gtag" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}');
        `}
      </Script>
    </>
  );
}
