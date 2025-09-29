import { PartialType } from "@nestjs/mapped-types"
import { CreateCertificationTypeDto } from "./create-certification-type.dto"

export class UpdateCertificationTypeDto extends PartialType(CreateCertificationTypeDto) {}
