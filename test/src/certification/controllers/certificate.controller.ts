import { Controller, Get, Post, Param, Body, Query, HttpCode, HttpStatus } from "@nestjs/common"
import type { CertificateService } from "../services/certificate.service"
import type { CreateCertificateDto } from "../dto/create-certificate.dto"

@Controller("certificates")
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @Post()
  async create(@Body() createDto: CreateCertificateDto) {
    return this.certificateService.create(createDto)
  }

  @Get()
  async findAll(@Query("userId") userId?: string) {
    return this.certificateService.findAll(userId)
  }

  @Get("user/:userId")
  async getUserCertificates(@Param("userId") userId: string) {
    return this.certificateService.getUserCertificates(userId)
  }

  @Get("stats")
  async getStats(@Query("userId") userId?: string) {
    return this.certificateService.getCertificateStats(userId)
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.certificateService.findOne(id)
  }

  @Post(":id/issue")
  async issue(@Param("id") id: string, @Body("issuedBy") issuedBy: string) {
    return this.certificateService.issueCertificate(id, issuedBy)
  }

  @Post(":id/revoke")
  async revoke(@Param("id") id: string, @Body("reason") reason: string) {
    return this.certificateService.revokeCertificate(id, reason)
  }

  @Post("verify")
  @HttpCode(HttpStatus.OK)
  async verify(@Body("certificateNumber") certificateNumber: string, @Body("verifierInfo") verifierInfo: any) {
    return this.certificateService.verifyCertificate(certificateNumber, verifierInfo)
  }
}
