/**
 * Transformer - Inserts images into statement
 * Same logic as original scraper
 */

export class HardworqTransformer {
  /**
   * Insert images into statement HTML
   * Creates img tags with local paths
   */
  insertImagesIntoStatement(statement: string, imageUrls: string[]): string {
    if (!imageUrls || imageUrls.length === 0) {
      return statement;
    }

    // Append images at the end of statement
    const imageTags = imageUrls
      .map((url, index) => this.createImageTag(url, index))
      .join('\n');

    return `${statement}\n\n${imageTags}`;
  }

  /**
   * Create HTML img tag for local image path
   */
  private createImageTag(imageUrl: string, index: number): string {
    // Extract filename from local path (Windows or Unix)
    const filename = imageUrl.includes('\\')
      ? imageUrl.split('\\').pop()
      : imageUrl.includes('/')
      ? imageUrl.split('/').pop()
      : imageUrl;

    // Create img tag with local API endpoint
    return `<img src="/api/temp-images/${filename}" alt="Imagem da questão ${index + 1}" style="max-width: 100%; height: auto;" />`;
  }
}
