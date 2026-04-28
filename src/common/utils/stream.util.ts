import { Readable } from 'stream';

/**
 * Utility class for streaming operations
 */
export class StreamUtil {
  /**
   * Convert an array to a readable stream
   * @param data - Array of items to stream
   * @param chunkSize - Number of items per chunk
   * @returns Readable stream
   */
  static arrayToStream<T>(data: T[], chunkSize = 100): Readable {
    let index = 0;
    
    return new Readable({
      objectMode: true,
      read() {
        const chunk = data.slice(index, index + chunkSize);
        index += chunkSize;
        
        if (chunk.length === 0) {
          this.push(null); // End of stream
        } else {
          this.push(chunk);
        }
      }
    });
  }

  /**
   * Convert a string to a readable stream
   * @param data - String data to stream
   * @param chunkSize - Size of each chunk in bytes
   * @returns Readable stream
   */
  static stringToStream(data: string, chunkSize = 1024): Readable {
    let index = 0;
    
    return new Readable({
      read() {
        if (index >= data.length) {
          this.push(null); // End of stream
          return;
        }
        
        const chunk = data.slice(index, index + chunkSize);
        index += chunkSize;
        this.push(chunk);
      }
    });
  }

  /**
   * Create a JSON stream from an array of objects
   * @param data - Array of objects to stream as JSON
   * @param chunkSize - Number of objects per chunk
   * @returns Readable stream of JSON lines
   */
  static jsonArrayToStream<T>(data: T[], chunkSize = 100): Readable {
    let index = 0;
    let isFirst = true;
    
    return new Readable({
      read() {
        if (index === 0) {
          this.push('['); // Start JSON array
        }
        
        const chunk = data.slice(index, index + chunkSize);
        index += chunkSize;
        
        if (chunk.length === 0) {
          this.push(']'); // End JSON array
          this.push(null);
        } else {
          const jsonChunk = chunk
            .map(item => {
              const json = JSON.stringify(item);
              return isFirst ? json : ',' + json;
            })
            .join('');
          
          isFirst = false;
          this.push(jsonChunk);
        }
      }
    });
  }
}
