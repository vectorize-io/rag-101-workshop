import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { z } from 'zod';
import { Configuration, PipelinesApi } from '@vectorize-io/vectorize-client';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Initialize Vectorize client
const vectorizeConfig = new Configuration({
  accessToken: process.env.VECTORIZE_API_TOKEN || '',
});

const pipelinesApi = new PipelinesApi(vectorizeConfig);

// Get organization and pipeline from environment variables
const organizationId = process.env.VECTORIZE_ORG_ID || '';
const pipelineId = process.env.VECTORIZE_PIPELINE_ID || '';

// Create a helper for Vectorize querying with debug logging
const vectorizeClient = {
  query: async (query: string, options: any = {}) => {
    console.log('🔍 Vectorize query:', { query, options });

    // Check environment variables
    if (!process.env.VECTORIZE_API_TOKEN || !organizationId || !pipelineId) {
      const missingVars = [
        !process.env.VECTORIZE_API_TOKEN && 'VECTORIZE_API_TOKEN',
        !organizationId && 'VECTORIZE_ORG_ID',
        !pipelineId && 'VECTORIZE_PIPELINE_ID',
      ]
        .filter(Boolean)
        .join(', ');

      const errorMsg = `Missing Vectorize environment variables: ${missingVars}`;
      console.error('❌ ' + errorMsg);
      throw new Error(errorMsg);
    }

    try {
      // Prepare metadata filters if needed
      const metadataFilters: Array<Record<string, string[]>> = [];
      if (options.metadataFilters && options.metadataFilters.length > 0) {
        options.metadataFilters.forEach((filterObj: any) => {
          Object.entries(filterObj).forEach(([key, value]: [string, any]) => {
            // Handle single value or array of values
            if (Array.isArray(value)) {
              metadataFilters.push({ [key]: value });
            } else {
              metadataFilters.push({ [key]: [value] });
            }
          });
        });
      }

      console.log('📤 Using metadata filters:', JSON.stringify(metadataFilters));

      // Prepare the request
      const retrieveRequest = {
        question: query,
        numResults: options.numResults || 5,
        ...(metadataFilters.length > 0 && { 'metadata-filters': metadataFilters }),
      };

      console.log('📤 Querying Vectorize:', JSON.stringify(retrieveRequest, null, 2));

      // Query Vectorize
      const queryResponse = await pipelinesApi.retrieveDocuments({
        organization: organizationId,
        pipeline: pipelineId,
        retrieveDocumentsRequest: retrieveRequest,
      });

      console.log('📥 Received from Vectorize:', {
        documents: queryResponse.documents?.length || 0,
      });

      // Format the response to match the expected structure
      const formattedResponse = {
        documents:
          queryResponse.documents?.map((doc) => ({
            id: doc.id,
            score: doc.score,
            metadata: doc.metadata,
            text: doc.text || 'No text available',
            chunk_id: doc.metadata?.chunk_id,
            filename: doc.metadata?.source_display_name || doc.metadata?.source,
            total_chunks: doc.metadata?.total_chunks,
            // Include structured metadata for easier access
            document_metadata: doc.metadata?.document_metadata,
          })) || [],
      };

      return formattedResponse;
    } catch (error: any) {
      console.error('❌ Vectorize query error:', error);
      // Log additional error details if available
      if (error?.response) {
        console.error('❌ Response error:', error.response);
        try {
          const errorText = await error.response.text();
          console.error('❌ Response text:', errorText);
        } catch (textError) {
          console.error('❌ Could not read error response text:', textError);
        }
      }
      throw error;
    }
  },
};

export async function POST(req: Request) {
  console.log('📨 POST request received');

  let messages;
  try {
    const body = await req.json();
    messages = body.messages;
    console.log('🤖 Parsed request body:', {
      messageCount: messages?.length || 0,
      lastUserMessage: messages?.filter((m) => m.role === 'user').pop()?.content || 'None',
    });
  } catch (error) {
    console.error('❌ Error parsing request body:', error);
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log('🔧 Setting up tools for AI');

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    temperature: 0.2, // Lowering temperature to make the model more likely to use tools
    system: `You are an electronics component search assistant. 
    
You have access to a database of electronic components. USE YOUR TOOLS to help users find components.

IMPORTANT: ALWAYS use the search tools provided to you when the user asks about electronic components. Do not try to answer from memory.

- Use 'searchAllDocuments' for general searches across all component types.
- Use 'searchByComponentType' for specific searches about particular component types.
- Use 'searchByManufacturer' for searches related to specific manufacturers.
- Use 'searchBySpecifications' for searches based on technical specifications like voltage, current, frequency, etc.

YOU MUST ALWAYS USE TOOLS. If you're not sure which tool to use, start with searchAllDocuments.

Examples:
- If user asks "what ADCs do you have?", use searchByComponentType with componentType="adc"
- If user asks "show me components from 3PEAK", use searchByManufacturer with manufacturer="3PEAK"
- If user asks "what op amps do you have?", use searchByComponentType with componentType="op_amp"
- If user asks "find op amps with supply voltage above 30V", use searchBySpecifications
`,
    tools: {
      // Simple search across all documents without filters
      searchAllDocuments: {
        description: 'Search across all technical documents to find relevant information about electronic components',
        parameters: z.object({
          query: z.string().describe('What you want to search for'),
          numResults: z.number().optional().describe('How many results you want (default: 20)'),
        }),
        execute: async ({ query, numResults = 20 }: { query: string; numResults?: number }) => {
          console.log('🔎 Executing searchAllDocuments:', { query, numResults });
          try {
            const result = await vectorizeClient.query(query, { numResults });
            console.log('✅ searchAllDocuments completed successfully');
            return result;
          } catch (error) {
            console.error('❌ searchAllDocuments error:', error);
            return {
              error: true,
              message: error instanceof Error ? error.message : 'Unknown error occurred',
              documents: [], // Provide empty documents array for graceful fallback
            };
          }
        },
      },

      // Search for a specific type of component
      searchByComponentType: {
        description: 'Find information about a specific type of electronic component',
        parameters: z.object({
          query: z.string().describe('What you want to know about this component'),
          componentType: z
            .enum(['op_amp', 'comparator', 'adc', 'microcontroller', 'current_sense_amplifier', 'rs485_transceiver', 'other'])
            .describe('The type of component you are interested in'),
          numResults: z.number().optional().describe('How many results you want (default: 20)'),
        }),
        execute: async ({
          query,
          componentType,
          numResults = 20,
        }: {
          query: string;
          componentType: 'op_amp' | 'comparator' | 'adc' | 'microcontroller' | 'current_sense_amplifier' | 'rs485_transceiver' | 'other';
          numResults?: number;
        }) => {
          console.log('🔎 Executing searchByComponentType:', { query, componentType, numResults });
          try {
            // Use metadata filter for component type
            const metadataFilters = [{ 'document_metadata.component_type': [componentType] }];

            const result = await vectorizeClient.query(query, {
              numResults,
              metadataFilters,
            });

            console.log('✅ searchByComponentType completed successfully');
            return result;
          } catch (error) {
            console.error('❌ searchByComponentType error:', error);
            return {
              error: true,
              message: error instanceof Error ? error.message : 'Unknown error occurred',
              documents: [], // Provide empty documents array for graceful fallback
            };
          }
        },
      },

      // Search for documents from a specific manufacturer (using part number patterns)
      searchByManufacturer: {
        description: 'Find technical documents from a specific manufacturer',
        parameters: z.object({
          query: z.string().describe('What you want to search for'),
          manufacturer: z.string().describe('Name of the manufacturer (e.g., "3PEAK", "Texas Instruments", "Analog Devices")'),
          numResults: z.number().optional().describe('How many results you want (default: 20)'),
        }),
        execute: async ({ query, manufacturer, numResults = 20 }: { query: string; manufacturer: string; numResults?: number }) => {
          console.log('🔎 Executing searchByManufacturer:', { query, manufacturer, numResults });
          try {
            // For manufacturer search, we'll use semantic search combined with the manufacturer name
            // since the new metadata doesn't have a dedicated manufacturer field
            const enhancedQuery = `${manufacturer} ${query}`;

            const result = await vectorizeClient.query(enhancedQuery, {
              numResults,
            });

            console.log('✅ searchByManufacturer completed successfully');
            return result;
          } catch (error) {
            console.error('❌ searchByManufacturer error:', error);
            return {
              error: true,
              message: error instanceof Error ? error.message : 'Unknown error occurred',
              documents: [], // Provide empty documents array for graceful fallback
            };
          }
        },
      },

      // Search by technical specifications
      searchBySpecifications: {
        description:
          'Find components based on technical specifications like voltage, current, frequency, temperature range, etc. Can also filter by component type.',
        parameters: z.object({
          query: z.string().describe('What you want to search for'),
          componentType: z
            .enum(['op_amp', 'comparator', 'adc', 'microcontroller', 'current_sense_amplifier', 'rs485_transceiver', 'other'])
            .optional()
            .describe('Optional: filter by component type first'),
          specifications: z
            .object({
              minSupplyVoltage: z.number().optional().describe('Minimum supply voltage in volts'),
              maxSupplyVoltage: z.number().optional().describe('Maximum supply voltage in volts'),
              minBandwidth: z.number().optional().describe('Minimum bandwidth in MHz'),
              maxQuiescentCurrent: z.number().optional().describe('Maximum quiescent current in microamperes'),
              minSlewRate: z.number().optional().describe('Minimum slew rate in V/µs'),
              temperatureProtection: z.boolean().optional().describe('Requires thermal protection'),
              outputType: z.enum(['rail_to_rail', 'open_drain', 'push_pull', 'unknown']).optional().describe('Required output type'),
            })
            .optional()
            .describe('Technical specifications to filter by'),
          numResults: z.number().optional().describe('How many results you want (default: 20)'),
        }),
        execute: async (params) => {
          const { query, componentType, specifications, numResults = 20 } = params;
          console.log('🔎 Executing searchBySpecifications:', { query, componentType, specifications, numResults });
          try {
            let enhancedQuery = query;
            const metadataFilters: Array<Record<string, string[]>> = [];

            // Add component type filter if specified
            if (componentType) {
              metadataFilters.push({ 'document_metadata.component_type': [componentType] });
            }

            // Build enhanced query from specifications
            if (specifications) {
              const specParts: string[] = [];
              if (specifications.minSupplyVoltage) specParts.push(`supply voltage above ${specifications.minSupplyVoltage}V`);
              if (specifications.maxSupplyVoltage) specParts.push(`supply voltage below ${specifications.maxSupplyVoltage}V`);
              if (specifications.minBandwidth) specParts.push(`bandwidth above ${specifications.minBandwidth}MHz`);
              if (specifications.maxQuiescentCurrent) specParts.push(`low power consumption below ${specifications.maxQuiescentCurrent}µA`);
              if (specifications.minSlewRate) specParts.push(`slew rate above ${specifications.minSlewRate}V/µs`);
              if (specifications.temperatureProtection) specParts.push('thermal protection');
              if (specifications.outputType) {
                const outputTypeStr = String(specifications.outputType);
                specParts.push(`${outputTypeStr} output`);
              }

              if (specParts.length > 0) {
                enhancedQuery = `${query} ${specParts.join(' ')}`;
              }
            }

            const result = await vectorizeClient.query(enhancedQuery, {
              numResults,
              metadataFilters: metadataFilters.length > 0 ? metadataFilters : undefined,
            });

            console.log('✅ searchBySpecifications completed successfully');
            return result;
          } catch (error) {
            console.error('❌ searchBySpecifications error:', error);
            return {
              error: true,
              message: error instanceof Error ? error.message : 'Unknown error occurred',
              documents: [], // Provide empty documents array for graceful fallback
            };
          }
        },
      },

      // Search by part number
      searchByPartNumber: {
        description: 'Find information about a specific part number',
        parameters: z.object({
          partNumber: z.string().describe('The part number to search for (e.g., "TP1281", "LM358")'),
          numResults: z.number().optional().describe('How many results you want (default: 20)'),
        }),
        execute: async ({ partNumber, numResults = 20 }: { partNumber: string; numResults?: number }) => {
          console.log('🔎 Executing searchByPartNumber:', { partNumber, numResults });
          try {
            // Use metadata filter for exact part number match
            const metadataFilters = [{ 'document_metadata.part_number': [partNumber] }];

            const result = await vectorizeClient.query(partNumber, {
              numResults,
              metadataFilters,
            });

            // If no exact match found, try partial matching with semantic search
            if (result.documents.length === 0) {
              console.log('🔍 No exact part number match, trying semantic search');
              const fallbackResult = await vectorizeClient.query(`part number ${partNumber}`, {
                numResults,
              });
              return fallbackResult;
            }

            console.log('✅ searchByPartNumber completed successfully');
            return result;
          } catch (error) {
            console.error('❌ searchByPartNumber error:', error);
            return {
              error: true,
              message: error instanceof Error ? error.message : 'Unknown error occurred',
              documents: [], // Provide empty documents array for graceful fallback
            };
          }
        },
      },

      // Ask user for confirmation
      askForConfirmation: {
        description: 'Ask the user for confirmation',
        parameters: z.object({
          message: z.string().describe('The message to ask for confirmation'),
        }),
      },
    },
  });

  console.log('🚀 Streaming response started');
  return result.toDataStreamResponse();
}
