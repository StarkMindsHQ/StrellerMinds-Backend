import { Injectable } from '@nestjs/common';

export interface CodeExample {
  language: string;
  code: string;
}

@Injectable()
export class ExampleGenerator {
  /**
   * Generates code examples for a given API endpoint and request details.
   */
  generateExamples(
    method: string,
    url: string,
    headers: Record<string, string> = {},
    body?: any,
  ): CodeExample[] {
    return [
      {
        language: 'curl',
        code: this.generateCurl(method, url, headers, body),
      },
      {
        language: 'javascript',
        code: this.generateJavascript(method, url, headers, body),
      },
      {
        language: 'python',
        code: this.generatePython(method, url, headers, body),
      },
    ];
  }

  private generateCurl(method: string, url: string, headers: Record<string, string>, body?: any): string {
    let curl = `curl -X ${method.toUpperCase()} '${url}'`;
    
    Object.entries(headers).forEach(([key, value]) => {
      curl += ` \\\n  -H '${key}: ${value}'`;
    });

    if (body) {
      curl += ` \\\n  -d '${JSON.stringify(body, null, 2)}'`;
    }

    return curl;
  }

  private generateJavascript(method: string, url: string, headers: Record<string, string>, body?: any): string {
    const config: any = {
      method: method.toUpperCase(),
      headers: headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    return `
fetch('${url}', ${JSON.stringify(config, null, 2)})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
`;
  }

  private generatePython(method: string, url: string, headers: Record<string, string>, body?: any): string {
    let python = `import requests\n\nurl = '${url}'\n`;
    
    if (Object.keys(headers).length > 0) {
      python += `headers = ${JSON.stringify(headers, null, 2)}\n`;
    } else {
      python += `headers = {}\n`;
    }

    if (body) {
      python += `data = ${JSON.stringify(body, null, 2)}\n`;
      python += `response = requests.${method.toLowerCase()}(url, headers=headers, json=data)\n`;
    } else {
      python += `response = requests.${method.toLowerCase()}(url, headers=headers)\n`;
    }

    python += `print(response.json())`;
    
    return python;
  }
}
