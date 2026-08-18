declare module "word-extractor" {
  class Document {
    getBody(): string;
    getHeaders(): string[];
    getFooters(): string[];
    getEndnotes(): string[];
    getFootnotes(): string[];
  }
  class WordExtractor {
    extract(filePathOrBuffer: string | Buffer): Promise<Document>;
  }
  export default WordExtractor;
}
