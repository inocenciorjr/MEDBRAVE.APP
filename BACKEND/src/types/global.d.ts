export {};

declare interface GlobalThis {
  tempAPKGSessions: Map<
    string,
    {
      resultado: any;
      duplicateHandling: string;
      userId: string;
      processedAt: string;
      expiresAt: string;
    }
  >;
}
