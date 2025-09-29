import { v4 as uuidv4 } from "uuid"

export function addTrackingToEmail(html: string, emailId: string, baseUrl: string): string {
  // Add tracking pixel for opens
  const trackingPixel = `<img src="${baseUrl}/email/track/open/${emailId}" width="1" height="1" alt="" style="display:none;">`

  // Add tracking to all links
  let modifiedHtml = html.replace(/<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["']/gi, (match, url) => {
    // Don't track unsubscribe links
    if (url.includes("/unsubscribe") || url.includes("/preferences")) {
      return match
    }

    const trackingUrl = `${baseUrl}/email/track/click/${emailId}?url=${encodeURIComponent(url)}`
    return match.replace(url, trackingUrl)
  })

  // Add tracking pixel at the end of the email
  modifiedHtml = modifiedHtml.replace("</body>", `${trackingPixel}</body>`)

  return modifiedHtml
}

export function generateEmailId(): string {
  return uuidv4()
}

