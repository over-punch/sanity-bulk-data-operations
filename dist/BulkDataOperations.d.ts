import React from 'react';
import { SanityClient } from 'sanity';
export interface BulkDataOperationsProps {
    client: SanityClient;
    documentTypes?: string[];
    onComplete?: (results: BulkOperationResult) => void;
    onError?: (error: string) => void;
    batchSize?: number;
    dryRun?: boolean;
    maxDocuments?: number;
}
export interface BulkOperationResult {
    processed: number;
    errors: string[];
    operation: 'search' | 'modify' | 'create';
}
declare const BulkDataOperations: React.FC<BulkDataOperationsProps>;
export default BulkDataOperations;
