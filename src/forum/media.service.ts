// src/forum/media.service.ts

export class MediaService {
  static formatContent(content: string) {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  }

  static embedImage(url: string) {
    return `<img src="${url}" alt="media" style="max-width:100%;" />`;
  }
}
