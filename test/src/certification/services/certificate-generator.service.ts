import { Injectable, Logger } from "@nestjs/common"
import type { Certificate } from "../entities/certificate.entity"
import * as fs from "fs"
import * as path from "path"
import * as PDFKit from "pdfkit" // Declare the variable before using it

@Injectable()
export class CertificateGeneratorService {
  private readonly logger = new Logger(CertificateGeneratorService.name)

  async generateCertificate(certificate: Certificate): Promise<string> {
    try {
      const fileName = `certificate-${certificate.certificateNumber}.pdf`
      const filePath = path.join(process.cwd(), "uploads", "certificates", fileName)

      // Ensure directory exists
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // Create PDF document
      const doc = new PDFKit({
        size: "A4",
        layout: "landscape",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      })

      // Pipe to file
      doc.pipe(fs.createWriteStream(filePath))

      // Generate certificate content
      await this.generateCertificateContent(doc, certificate)

      // Finalize PDF
      doc.end()

      this.logger.log(`Certificate generated: ${fileName}`)
      return `/uploads/certificates/${fileName}`
    } catch (error) {
      this.logger.error("Failed to generate certificate:", error)
      throw error
    }
  }

  private async generateCertificateContent(doc: PDFKit.PDFDocument, certificate: Certificate): Promise<void> {
    const template = certificate.certificationType.template || {}

    // Set background color
    if (template.backgroundColor) {
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(template.backgroundColor)
    }

    // Add border
    doc
      .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
      .stroke("#000000")
      .lineWidth(3)

    // Add decorative border
    doc
      .rect(40, 40, doc.page.width - 80, doc.page.height - 80)
      .stroke("#cccccc")
      .lineWidth(1)

    // Title
    doc
      .fontSize(36)
      .font("Helvetica-Bold")
      .fillColor(template.textColor || "#000000")
      .text("CERTIFICATE OF COMPLETION", 0, 120, { align: "center" })

    // Subtitle
    doc.fontSize(18).font("Helvetica").text("This is to certify that", 0, 180, { align: "center" })

    // Recipient name
    doc
      .fontSize(32)
      .font("Helvetica-Bold")
      .fillColor("#2c5aa0")
      .text(certificate.recipientName, 0, 220, { align: "center" })

    // Completion text
    doc
      .fontSize(18)
      .font("Helvetica")
      .fillColor(template.textColor || "#000000")
      .text("has successfully completed", 0, 280, { align: "center" })

    // Course/Certification name
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .fillColor("#2c5aa0")
      .text(certificate.certificationType.name, 0, 320, { align: "center" })

    // Score (if available)
    if (certificate.score) {
      doc
        .fontSize(16)
        .font("Helvetica")
        .fillColor(template.textColor || "#000000")
        .text(`Score: ${certificate.score}%`, 0, 370, { align: "center" })
    }

    // Date
    const dateText = certificate.issuedAt
      ? `Issued on ${certificate.issuedAt.toLocaleDateString()}`
      : `Created on ${certificate.createdAt.toLocaleDateString()}`

    doc.fontSize(14).font("Helvetica").text(dateText, 0, 420, { align: "center" })

    // Certificate number
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Certificate Number: ${certificate.certificateNumber}`, 0, 450, { align: "center" })

    // Verification hash (QR code placeholder)
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Verification: ${certificate.verificationHash?.substring(0, 16)}...`, 0, 480, { align: "center" })

    // Footer
    doc
      .fontSize(12)
      .font("Helvetica-Oblique")
      .text("This certificate can be verified at our official website", 0, 520, { align: "center" })

    // Add logo if provided
    if (template.logoUrl) {
      try {
        // In a real implementation, you would download and add the logo
        // doc.image(logoPath, 50, 50, { width: 100 });
      } catch (error) {
        this.logger.warn("Failed to add logo to certificate:", error)
      }
    }
  }

  async generateBatchCertificates(certificates: Certificate[]): Promise<string[]> {
    const results: string[] = []

    for (const certificate of certificates) {
      try {
        const url = await this.generateCertificate(certificate)
        results.push(url)
      } catch (error) {
        this.logger.error(`Failed to generate certificate for ${certificate.id}:`, error)
        results.push("")
      }
    }

    return results
  }
}
