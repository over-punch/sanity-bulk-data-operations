import React, { useState, useCallback } from 'react'
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Select,
  Stack,
  Text,
  TextArea,
  TextInput,
  Checkbox,
  Badge,
  Spinner,
  Toast
} from '@sanity/ui'
import { SearchIcon, EditIcon, AddIcon } from '@sanity/icons'
import { SanityClient } from 'sanity'

export interface BulkDataOperationsProps {
  client: SanityClient
  documentTypes?: string[]
  onComplete?: (results: BulkOperationResult) => void
  onError?: (error: string) => void
  batchSize?: number
  dryRun?: boolean
  maxDocuments?: number
}

export interface BulkOperationResult {
  processed: number
  errors: string[]
  operation: 'search' | 'modify' | 'create'
}

const BulkDataOperations: React.FC<BulkDataOperationsProps> = ({
  client,
  documentTypes = [],
  onComplete,
  onError,
  batchSize = 10,
  dryRun = false,
  maxDocuments = 1000
}) => {
  const [operation, setOperation] = useState<'search' | 'modify' | 'create'>('search')
  const [selectedType, setSelectedType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [useCustomQuery, setUseCustomQuery] = useState(false)
  const [customGroqQuery, setCustomGroqQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [fieldToModify, setFieldToModify] = useState('')
  const [newValue, setNewValue] = useState('')
  const [templateData, setTemplateData] = useState('')

  const handleSearch = useCallback(async () => {
    if (!client) return
    
    setIsLoading(true)
    setMessage('Searching documents...')
    
    try {
      let query = ''
      
      if (useCustomQuery && customGroqQuery) {
        query = customGroqQuery
      } else {
        const typeFilter = selectedType ? `_type == "${selectedType}"` : 'defined(_type)'
        const searchFilter = searchQuery ? ` && (title match "*${searchQuery}*" || name match "*${searchQuery}*")` : ''
        query = `*[${typeFilter}${searchFilter}][0...${maxDocuments}]`
      }
      
      const documents = await client.fetch(query)
      setResults(documents)
      setMessage(`Found ${documents.length} documents`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed'
      setMessage(`Search error: ${errorMessage}`)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [client, selectedType, searchQuery, useCustomQuery, customGroqQuery, maxDocuments, onError])

  const handleBulkModify = useCallback(async () => {
    if (!client || !fieldToModify || results.length === 0) return
    
    setIsLoading(true)
    setMessage('Processing bulk modifications...')
    
    try {
      let processed = 0
      const errors: string[] = []
      
      for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize)
        
        for (const doc of batch) {
          try {
            if (!dryRun) {
              await client
                .patch(doc._id)
                .set({ [fieldToModify]: newValue })
                .commit()
            }
            processed++
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Modification failed'
            errors.push(`Failed to modify ${doc._id}: ${errorMessage}`)
          }
        }
        
        setMessage(`${dryRun ? 'Would modify' : 'Modified'} ${processed}/${results.length} documents...`)
      }
      
      const result: BulkOperationResult = {
        processed,
        errors,
        operation: 'modify'
      }
      
      setMessage(`${dryRun ? 'Dry run complete' : 'Bulk modification complete'}: ${processed} documents processed`)
      onComplete?.(result)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bulk modification failed'
      setMessage(`Operation error: ${errorMessage}`)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [client, fieldToModify, newValue, results, batchSize, dryRun, onComplete, onError])

  const handleBulkCreate = useCallback(async () => {
    if (!client || !templateData || !selectedType) return
    
    setIsLoading(true)
    setMessage('Creating documents...')
    
    try {
      const template = JSON.parse(templateData)
      const documents = Array.isArray(template) ? template : [template]
      
      let processed = 0
      const errors: string[] = []
      
      for (const docData of documents) {
        try {
          if (!dryRun) {
            await client.create({
              _type: selectedType,
              ...docData
            })
          }
          processed++
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Creation failed'
          errors.push(`Failed to create document: ${errorMessage}`)
        }
      }
      
      const result: BulkOperationResult = {
        processed,
        errors,
        operation: 'create'
      }
      
      setMessage(`${dryRun ? 'Dry run complete' : 'Bulk creation complete'}: ${processed} documents processed`)
      onComplete?.(result)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bulk creation failed'
      setMessage(`Operation error: ${errorMessage}`)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [client, templateData, selectedType, dryRun, onComplete, onError])

  return (
    <Card padding={4}>
      <Stack space={4}>
        <Heading size={2}>Bulk Data Operations</Heading>
        
        {/* Operation Type Selection */}
        <Card padding={3} tone="primary">
          <Stack space={3}>
            <Text weight="semibold">Operation Type</Text>
            <Flex gap={3}>
              <Button
                mode={operation === 'search' ? 'default' : 'ghost'}
                icon={SearchIcon}
                text="Search"
                onClick={() => setOperation('search')}
              />
              <Button
                mode={operation === 'modify' ? 'default' : 'ghost'}
                icon={EditIcon}
                text="Modify"
                onClick={() => setOperation('modify')}
              />
              <Button
                mode={operation === 'create' ? 'default' : 'ghost'}
                icon={AddIcon}
                text="Create"
                onClick={() => setOperation('create')}
              />
            </Flex>
          </Stack>
        </Card>

        {/* Document Type Selection */}
        <Stack space={2}>
          <Text weight="semibold">Document Type</Text>
          <Select
            value={selectedType}
            onChange={(event) => setSelectedType(event.currentTarget.value)}
          >
            <option value="">All document types</option>
            {documentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select>
        </Stack>

        {/* Search Configuration */}
        {(operation === 'search' || operation === 'modify') && (
          <Stack space={3}>
            <Text weight="semibold">Search Configuration</Text>
            
            <Checkbox
              checked={useCustomQuery}
              onChange={(event) => setUseCustomQuery(event.currentTarget.checked)}
            >
              Use custom GROQ query
            </Checkbox>
            
            {useCustomQuery ? (
              <TextArea
                placeholder="Enter GROQ query (e.g., *[_type == 'post' && defined(title)])..."
                value={customGroqQuery}
                onChange={(event) => setCustomGroqQuery(event.currentTarget.value)}
                rows={3}
              />
            ) : (
              <TextInput
                placeholder="Search in title, name, or other fields..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                onKeyPress={(event) => event.key === 'Enter' && handleSearch()}
              />
            )}
            
            <Button
              text="Search Documents"
              onClick={handleSearch}
              disabled={isLoading}
              tone="primary"
            />
          </Stack>
        )}

        {/* Modification Configuration */}
        {operation === 'modify' && results.length > 0 && (
          <Stack space={3}>
            <Text weight="semibold">Modification Configuration</Text>
            <TextInput
              placeholder="Field to modify (e.g., status, category)..."
              value={fieldToModify}
              onChange={(event) => setFieldToModify(event.currentTarget.value)}
            />
            <TextInput
              placeholder="New value..."
              value={newValue}
              onChange={(event) => setNewValue(event.currentTarget.value)}
            />
            <Button
              text={dryRun ? 'Preview Modifications' : 'Apply Modifications'}
              onClick={handleBulkModify}
              disabled={isLoading || !fieldToModify}
              tone="caution"
            />
          </Stack>
        )}

        {/* Creation Configuration */}
        {operation === 'create' && (
          <Stack space={3}>
            <Text weight="semibold">Creation Configuration</Text>
            <TextArea
              placeholder='Enter JSON template or array of objects...\n{"title": "Example", "content": "..."}'
              value={templateData}
              onChange={(event) => setTemplateData(event.currentTarget.value)}
              rows={6}
            />
            <Button
              text={dryRun ? 'Preview Creation' : 'Create Documents'}
              onClick={handleBulkCreate}
              disabled={isLoading || !templateData || !selectedType}
              tone="positive"
            />
          </Stack>
        )}

        {/* Results */}
        {results.length > 0 && (
          <Card padding={3} tone="transparent">
            <Stack space={2}>
              <Flex align="center" gap={2}>
                <Text weight="semibold">Results</Text>
                <Badge tone="primary">{results.length} documents</Badge>
              </Flex>
              <Box style={{ maxHeight: '200px', overflow: 'auto' }}>
                <Stack space={2}>
                  {results.slice(0, 10).map((doc, index) => (
                    <Card key={doc._id || index} padding={2} tone="default">
                      <Text size={1}>
                        <strong>{doc._type}</strong>: {doc.title || doc.name || doc._id}
                      </Text>
                    </Card>
                  ))}
                  {results.length > 10 && (
                    <Text size={1} muted>...and {results.length - 10} more</Text>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Card>
        )}

        {/* Status */}
        {(isLoading || message) && (
          <Card padding={3} tone={isLoading ? 'primary' : 'positive'}>
            <Flex align="center" gap={2}>
              {isLoading && <Spinner />}
              <Text>{message}</Text>
            </Flex>
          </Card>
        )}

        {/* Settings */}
        <Card padding={3} tone="transparent">
          <Stack space={2}>
            <Text weight="semibold" size={1}>Settings</Text>
            <Flex gap={3} align="center">
              <Checkbox checked={dryRun} readOnly>
                Dry run mode: {dryRun ? 'ON' : 'OFF'}
              </Checkbox>
              <Text size={1} muted>Batch size: {batchSize}</Text>
              <Text size={1} muted>Max documents: {maxDocuments}</Text>
            </Flex>
          </Stack>
        </Card>
      </Stack>
    </Card>
  )
}

export default BulkDataOperations
