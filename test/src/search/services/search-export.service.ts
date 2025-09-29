import { Injectable, Logger } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import * as XLSX from "xlsx"
import * as PDFDocument from "pdfkit"
import { createWriteStream, promises as fs } from "fs"
import { join } from "path"
import type { SearchExportDto } from "../dto/search-export.dto"

@Injectable()
export class SearchExportService {
  private readonly logger = new Logger(SearchExportService.name)
  private readonly exportDir: string

  constructor(private readonly configService: ConfigService) {
    this.exportDir = this.configService.get<string>("EXPORT_DIR", "./exports")
  }

  async exportResults(exportDto: SearchExportDto, userId: string): Promise<{ downloadUrl: string }> {
    try {
      // Ensure export directory exists
      await fs.mkdir(this.exportDir, { recursive: true })

      const filename = `search_export_${userId}_${Date.now()}`
      let filePath: string

      switch (exportDto.format) {
        case "excel":
          filePath = await this.exportToExcel(exportDto, filename)
          break
        case "csv":
          filePath = await this.exportToCSV(exportDto, filename)
          break
        case "pdf":
          filePath = await this.exportToPDF(exportDto, filename)
          break
        case "json":
          filePath = await this.exportToJSON(exportDto, filename)
          break
        default:
          throw new Error("Unsupported export format")
      }

      // Generate download URL (this would typically be a signed URL for cloud storage)
      const downloadUrl = `/api/exports/download/${filename}.${exportDto.format}`

      return { downloadUrl }
    } catch (error) {
      this.logger.error("Export results failed", error)
      throw error
    }
  }

  private async exportToExcel(exportDto: SearchExportDto, filename: string): Promise<string> {
    const workbook = XLSX.utils.book_new()

    // Convert search results to worksheet data
    const worksheetData = exportDto.searchResults.map((course) => ({
      "Course ID": course.id,
      Title: course.title,
      Description: course.description,
      Category: course.category,
      Level: course.level,
      "Duration (minutes)": course.duration,
      Price: course.price,
      Instructor: course.instructor,
      Rating: course.rating,
      "Enrollment Count": course.enrollmentCount,
      Tags: course.tags?.join(", ") || "",
      Skills: course.skills?.join(", ") || "",
      "Created At": course.createdAt,
      "Updated At": course.updatedAt,
    }))

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)
    XLSX.utils.book_append_sheet(workbook, worksheet, "Search Results")

    // Add metadata sheet
    const metadataSheet = XLSX.utils.json_to_sheet([
      { Property: "Export Date", Value: new Date().toISOString() },
      { Property: "Total Results", Value: exportDto.searchResults.length },
      { Property: "Search Query", Value: exportDto.searchQuery || "N/A" },
      { Property: "Filters Applied", Value: JSON.stringify(exportDto.filters || {}) },
    ])
    XLSX.utils.book_append_sheet(workbook, metadataSheet, "Metadata")

    const filePath = join(this.exportDir, `${filename}.xlsx`)
    XLSX.writeFile(workbook, filePath)

    return filePath
  }

  private async exportToCSV(exportDto: SearchExportDto, filename: string): Promise<string> {
    const csvData = exportDto.searchResults.map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      duration: course.duration,
      price: course.price,
      instructor: course.instructor,
      rating: course.rating,
      enrollmentCount: course.enrollmentCount,
      tags: course.tags?.join("; ") || "",
      skills: course.skills?.join("; ") || "",
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    }))

    const worksheet = XLSX.utils.json_to_sheet(csvData)
    const csv = XLSX.utils.sheet_to_csv(worksheet)

    const filePath = join(this.exportDir, `${filename}.csv`)
    await fs.writeFile(filePath, csv, "utf8")

    return filePath
  }

  private async exportToPDF(exportDto: SearchExportDto, filename: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const filePath = join(this.exportDir, `${filename}.pdf`)
      const doc = new PDFDocument()
      const stream = createWriteStream(filePath)

      doc.pipe(stream)

      // Add title
      doc.fontSize(20).text("Search Results Export", { align: "center" })
      doc.moveDown()

      // Add metadata
      doc.fontSize(12)
      doc.text(`Export Date: ${new Date().toISOString()}`)
      doc.text(`Total Results: ${exportDto.searchResults.length}`)
      doc.text(`Search Query: ${exportDto.searchQuery || "N/A"}`)
      doc.moveDown()

      // Add results
      exportDto.searchResults.forEach((course, index) => {
        if (index > 0) doc.addPage()

        doc.fontSize(16).text(course.title, { underline: true })
        doc.moveDown(0.5)

        doc.fontSize(12)
        doc.text(`Category: ${course.category}`)
        doc.text(`Level: ${course.level}`)
        doc.text(`Duration: ${course.duration} minutes`)
        doc.text(`Price: $${course.price}`)
        doc.text(`Instructor: ${course.instructor}`)
        doc.text(`Rating: ${course.rating}/5`)
        doc.moveDown()

        doc.text("Description:")
        doc.text(course.description, { width: 500 })

        if (course.tags?.length) {
          doc.moveDown()
          doc.text(`Tags: ${course.tags.join(", ")}`)
        }

        if (course.skills?.length) {
          doc.text(`Skills: ${course.skills.join(", ")}`)
        }
      })

      doc.end()

      stream.on("finish", () => resolve(filePath))
      stream.on("error", reject)
    })
  }

  private async exportToJSON(exportDto: SearchExportDto, filename: string): Promise<string> {
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalResults: exportDto.searchResults.length,
        searchQuery: exportDto.searchQuery,
        filters: exportDto.filters,
      },
      results: exportDto.searchResults,
    }

    const filePath = join(this.exportDir, `${filename}.json`)
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), "utf8")

    return filePath
  }

  async cleanupOldExports(): Promise<void> {
    try {
      const files = await fs.readdir(this.exportDir)
      const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days ago

      for (const file of files) {
        const filePath = join(this.exportDir, file)
        const stats = await fs.stat(filePath)

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath)
          this.logger.log(`Deleted old export file: ${file}`)
        }
      }
    } catch (error) {
      this.logger.error("Cleanup old exports failed", error)
    }
  }
}
