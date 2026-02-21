import { Injectable, Logger } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { NestApplication } from '@nestjs/core';

export interface CodeExample {
  language: 'curl' | 'javascript' | 'typescript' | 'python' | 'java' | 'php' | 'ruby';
  code: string;
  label: string;
}

export interface EndpointExample {
  method: string;
  path: string;
  summary: string;
  description?: string;
  parameters?: Array<{
    name: string;
    in: string;
    required: boolean;
    type: string;
    example?: any;
  }>;
  requestBody?: {
    contentType: string;
    example: any;
  };
  responses: Record<string, {
    description: string;
    example: any;
  }>;
  codeExamples: CodeExample[];
}

@Injectable()
export class ApiExplorerService {
  private readonly logger = new Logger(ApiExplorerService.name);

  /**
   * Get OpenAPI specification
   */
  getOpenApiSpec(app: NestApplication): any {
    try {
      const document = SwaggerModule.createDocument(app, {} as any);
      return document;
    } catch (error) {
      this.logger.error(`Failed to get OpenAPI spec: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate code examples for an endpoint
   */
  generateCodeExamples(
    method: string,
    path: string,
    baseUrl: string,
    options?: {
      parameters?: any;
      requestBody?: any;
      headers?: Record<string, string>;
    },
  ): CodeExample[] {
    const examples: CodeExample[] = [];

    // cURL example
    examples.push({
      language: 'curl',
      label: 'cURL',
      code: this.generateCurlExample(method, path, baseUrl, options),
    });

    // JavaScript example
    examples.push({
      language: 'javascript',
      label: 'JavaScript (Fetch)',
      code: this.generateJavaScriptExample(method, path, baseUrl, options),
    });

    // TypeScript example
    examples.push({
      language: 'typescript',
      label: 'TypeScript',
      code: this.generateTypeScriptExample(method, path, baseUrl, options),
    });

    // Python example
    examples.push({
      language: 'python',
      label: 'Python',
      code: this.generatePythonExample(method, path, baseUrl, options),
    });

    return examples;
  }

  /**
   * Generate cURL example
   */
  private generateCurlExample(
    method: string,
    path: string,
    baseUrl: string,
    options?: any,
  ): string {
    let curl = `curl -X ${method.toUpperCase()} \\\n`;
    curl += `  "${baseUrl}${path}"`;

    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        curl += ` \\\n  -H "${key}: ${value}"`;
      });
    }

    if (options?.requestBody) {
      curl += ` \\\n  -H "Content-Type: application/json"`;
      curl += ` \\\n  -d '${JSON.stringify(options.requestBody, null, 2)}'`;
    }

    return curl;
  }

  /**
   * Generate JavaScript example
   */
  private generateJavaScriptExample(
    method: string,
    path: string,
    baseUrl: string,
    options?: any,
  ): string {
    let code = `const response = await fetch(\`${baseUrl}${path}\`, {\n`;
    code += `  method: '${method.toUpperCase()}',\n`;

    if (options?.headers || options?.requestBody) {
      code += `  headers: {\n`;
      if (options?.requestBody) {
        code += `    'Content-Type': 'application/json',\n`;
      }
      if (options?.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          code += `    '${key}': '${value}',\n`;
        });
      }
      code += `  },\n`;
    }

    if (options?.requestBody) {
      code += `  body: JSON.stringify(${JSON.stringify(options.requestBody, null, 2)}),\n`;
    }

    code += `});\n`;
    code += `const data = await response.json();\n`;
    code += `console.log(data);`;

    return code;
  }

  /**
   * Generate TypeScript example
   */
  private generateTypeScriptExample(
    method: string,
    path: string,
    baseUrl: string,
    options?: any,
  ): string {
    let code = `interface Response {\n`;
    code += `  success: boolean;\n`;
    code += `  data: any;\n`;
    code += `}\n\n`;

    code += `const response = await fetch(\`${baseUrl}${path}\`, {\n`;
    code += `  method: '${method.toUpperCase()}',\n`;

    if (options?.headers || options?.requestBody) {
      code += `  headers: {\n`;
      if (options?.requestBody) {
        code += `    'Content-Type': 'application/json',\n`;
      }
      if (options?.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          code += `    '${key}': '${value}',\n`;
        });
      }
      code += `  },\n`;
    }

    if (options?.requestBody) {
      code += `  body: JSON.stringify(${JSON.stringify(options.requestBody, null, 2)}),\n`;
    }

    code += `});\n`;
    code += `const data: Response = await response.json();\n`;
    code += `console.log(data);`;

    return code;
  }

  /**
   * Generate Python example
   */
  private generatePythonExample(
    method: string,
    path: string,
    baseUrl: string,
    options?: any,
  ): string {
    let code = `import requests\n\n`;

    code += `url = "${baseUrl}${path}"\n`;
    code += `headers = {`;

    if (options?.headers) {
      code += `\n`;
      Object.entries(options.headers).forEach(([key, value]) => {
        code += `    "${key}": "${value}",\n`;
      });
      code += `}`;
    } else {
      code += `}`;
    }

    if (options?.requestBody) {
      code += `\n`;
      code += `data = ${JSON.stringify(options.requestBody, null, 2)}\n`;
      code += `\n`;
      code += `response = requests.${method.toLowerCase()}(url, headers=headers, json=data)\n`;
    } else {
      code += `\n`;
      code += `response = requests.${method.toLowerCase()}(url, headers=headers)\n`;
    }

    code += `print(response.json())`;

    return code;
  }

  /**
   * Get endpoint details with examples
   */
  getEndpointDetails(spec: any, path: string, method: string): EndpointExample | null {
    const endpoint = spec.paths?.[path]?.[method.toLowerCase()];
    if (!endpoint) return null;

    const baseUrl = spec.servers?.[0]?.url || 'https://api.strellerminds.com';

    const codeExamples = this.generateCodeExamples(
      method,
      path,
      baseUrl,
      {
        parameters: endpoint.parameters,
        requestBody: endpoint.requestBody?.content?.['application/json']?.example,
        headers: {
          Authorization: 'Bearer YOUR_TOKEN',
        },
      },
    );

    return {
      method: method.toUpperCase(),
      path,
      summary: endpoint.summary || '',
      description: endpoint.description,
      parameters: endpoint.parameters?.map((p: any) => ({
        name: p.name,
        in: p.in,
        required: p.required || false,
        type: p.schema?.type || 'string',
        example: p.example,
      })),
      requestBody: endpoint.requestBody
        ? {
            contentType: 'application/json',
            example: endpoint.requestBody.content?.['application/json']?.example,
          }
        : undefined,
      responses: Object.entries(endpoint.responses || {}).reduce((acc, [code, response]: [string, any]) => {
        acc[code] = {
          description: response.description || '',
          example: response.content?.['application/json']?.example,
        };
        return acc;
      }, {} as Record<string, any>),
      codeExamples,
    };
  }
}
