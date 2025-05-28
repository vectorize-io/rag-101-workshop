# RAG 101 Workshop Lab Guide

## Prerequisites

Before starting the labs, clone the workshop repository:

```bash
git clone git@github.com:vectorize-io/rag-101-workshop.git
cd rag-101-workshop
```

---

## Lab 0: Creating a Metadata Schema

In this lab, you'll create a metadata schema that will be used to extract structured information from your documents during the RAG pipeline processing.

### Step 1: Access the Schema Creation Interface

1. In the Vectorize platform, navigate to the **Metadata** section in the left sidebar
2. Click on **New Schema** to create a new metadata schema

![New Schema Button](lab0-new-schema.png)

### Step 2: Choose Schema Creation Method

When prompted "How would you like to create your schema?", select **Start Blank** to create a new metadata schema from scratch with an empty template.

![Start Blank Option](lab0-start-blank.png)

### Step 3: Configure the Schema

1. **Name your schema**: Enter `Datasheet` as the schema name
2. **Switch to JSON Mode**: Click on the **JSON Mode** tab to edit the schema directly
3. **Paste the schema definition**: Copy the contents of `schema.json` from the repository (`agent-lab-1/schema.json`) and paste it into the JSON editor

The schema defines the structure for extracting information from electronic component datasheets, including:

- Component type (op_amp, comparator, adc, etc.)
- Features array
- Temperature range (min/max values)
- Temperature protection (boolean)
- Output type
- Slew rate
- Supply voltage range
- Part number
- Input bias current
- Quiescent current
- Bandwidth
- Applications

### Step 4: Create the Schema

Click **Create Schema** to save your metadata schema. You should see a success message confirming that the "Metadata schema created successfully".

The schema is now ready to be used in your RAG pipeline and will appear in your list of available metadata schemas.

---

## Lab 1: Building the RAG Pipeline

Now that you have created the metadata schema, you'll build a complete RAG pipeline to process and vectorize your documents.

### Step 1: Start Creating a New Pipeline

1. From the main dashboard, click on **New RAG Pipeline** in the left sidebar
2. This will open the pipeline builder interface

### Step 2: Configure the Source

1. Click on **Select Source** in the Source component
2. Choose **File Upload** from the available source options
3. In the file upload interface:
   - **Name**: Enter `Agent PDFs`
   - **Select files**: Drag and drop the PDF files from the `agent-pdfs` folder in your cloned repository, or click "Select files" to browse and upload them
   - Click **Confirm Selection** to proceed

![File Upload Configuration](lab1-file-upload.png)

### Step 3: Configure the Extractor and Chunker

The Extractor and Chunker component should be automatically configured with:

- **Extraction Strategy**: Set to "Vectorize Iris" (this should be selected by default)
- **Chunk Size**: 500 tokens
- **Chunk Overlap**: 0 tokens

### Step 4: Configure Iris Metadata Extraction

1. **Enable Metadata Extraction**: Toggle the switch to enable metadata extraction
2. **Select Schema**: Choose the "Datasheet" schema you created in Lab 0 from the dropdown menu

This will enable structured data extraction from your documents using the schema you defined.

### Step 5: Configure the AI Platform

1. Click on **Select AI Platform** in the Embedder component
2. Choose **Built-in** option (recommended) for a fully managed, optimized AI platform with no setup required

### Step 6: Configure Vector Database

1. Click on **Select Vector Database** in the Vector Database component
2. Select your preferred vector database option (the built-in option is recommended for this workshop)

### Step 7: Name and Deploy the Pipeline

1. At the top of the pipeline builder, replace "Untitled Pipeline 1" with a descriptive name like "Datasheet Processing Pipeline"
2. Click **Deploy RAG Pipeline** to create and start your pipeline

### Step 8: Monitor Pipeline Execution

Once deployed, your pipeline will:

1. Process the uploaded PDF files
2. Extract text and chunk it into 500-token segments
3. Extract structured metadata using your Datasheet schema
4. Generate embeddings using the selected AI platform
5. Store the vectors and metadata in your chosen vector database

You can monitor the progress and view logs to ensure successful processing.

---

## What's Next?

With your RAG pipeline deployed, you now have:

- ✅ A structured metadata schema for electronic component datasheets
- ✅ A complete RAG pipeline that processes PDFs and extracts structured information
- ✅ Vectorized document content stored in a searchable database

You can now query your RAG system to find relevant information about electronic components, with both semantic search capabilities and structured metadata filtering.

## Troubleshooting

If you encounter issues:

1. Check the pipeline logs for any error messages
2. Ensure all PDF files were uploaded successfully
3. Verify that the metadata schema was created correctly
4. Make sure you have sufficient credits/quota for processing

For additional support, refer to the Vectorize documentation or reach out to the workshop facilitators.
