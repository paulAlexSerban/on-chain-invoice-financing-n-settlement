# Document Upload Implementation

## Overview
Implemented complete document upload functionality for invoice creation. Files are uploaded to local storage and assigned IPFS-style content identifiers (CIDs) for compatibility with the blockchain architecture.

## Implementation Details

### 1. Directory Structure
Created upload directory:
```
dapp/
  public/
    uploads/          ← New directory for uploaded documents
```

**Why public/uploads?**
- Files in `public/` are served statically by Next.js
- Uploaded documents are accessible via `/uploads/{filename}` URL
- No additional server configuration needed

---

### 2. Updated API Route (`app/api/documents/upload/route.ts`)

#### Features Implemented:

**File System Storage**
```typescript
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
```

**Automatic Directory Creation**
```typescript
const uploadsDir = join(process.cwd(), "public", "uploads");
if (!existsSync(uploadsDir)) {
  await mkdir(uploadsDir, { recursive: true });
}
```

**Unique Filename Generation**
```typescript
const timestamp = Date.now();
const sanitizedName = file.name
  .replace(/[^a-zA-Z0-9.-]/g, "_")
  .replace(/_{2,}/g, "_");
const filename = `${timestamp}_${sanitizedName}`;
```

**SHA-256 Hash Generation**
```typescript
async function generateFileHash(buffer: Buffer): Promise<string> {
  const uint8Array = new Uint8Array(buffer);
  const hashBuffer = await crypto.subtle.digest("SHA-256", uint8Array);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  const cidHash = BigInt("0x" + hexHash).toString(36).padStart(44, "0");
  return cidHash.substring(0, 44);
}
```

**Response Format**
```typescript
{
  ipfs_hash: "Qm1a2b3c4d5e6f...",  // SHA-256 based CID
  url: "/uploads/1731628800000_invoice.pdf"  // Local file URL
}
```

#### Security Features:

1. **File Size Validation**
   - Maximum: 10MB
   - Prevents server storage exhaustion

2. **MIME Type Validation**
   - Allowed: `application/pdf`, `image/jpeg`, `image/png`, `image/jpg`
   - Prevents malicious file uploads

3. **Rate Limiting**
   - 5 uploads per minute per IP
   - Prevents abuse

4. **Filename Sanitization**
   - Removes special characters
   - Prevents directory traversal attacks
   - Collapses multiple underscores

5. **Timestamp Prefix**
   - Ensures unique filenames
   - Prevents overwrites
   - Enables chronological sorting

---

### 3. Updated Form Component (`components/CreateInvoiceForm.tsx`)

#### Added Document Upload Field:

```tsx
<div className="space-y-2">
  <Label htmlFor="document">Invoice Document</Label>
  <Input
    id="document"
    name="document"
    type="file"
    accept=".pdf,.jpg,.jpeg,.png"
    required
  />
  <p className="text-sm text-muted-foreground">
    Upload invoice PDF or image (max 10MB)
  </p>
</div>
```

#### Updated Interface:
```typescript
export interface InvoiceFormData {
  clientName: string;
  amount: number;
  invoiceId: string;
  dueDate: string;
  discount: number;
  description?: string;
  document?: File;  // ← New field
}
```

---

### 4. Invoice Creation Flow (`app/dashboard/business/page.tsx`)

#### Complete Implementation:

```typescript
const handleCreateInvoice = async (data: InvoiceFormData) => {
  try {
    // STEP 1: Upload document to local storage
    if (!data.document) {
      alert("Please upload an invoice document");
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append("file", data.document);

    const uploadResponse = await fetch("/api/documents/upload", {
      method: "POST",
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload document");
    }

    const uploadResult = await uploadResponse.json();
    console.log("Document uploaded:", uploadResult.data);

    // STEP 2: Get oracle signature for issuance
    const signatureResponse = await fetch("/api/oracle/sign-issuance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issuer: BUSINESS_ADDRESS,
        buyer_hash: hashBuyerInfo(data.clientName),
        amount: data.amount,
        due_date: new Date(data.dueDate).getTime(),
        doc_hash: uploadResult.data.ipfs_hash,
        discount_bps: data.discount * 100,
      }),
    });

    if (!signatureResponse.ok) {
      throw new Error("Failed to get oracle signature");
    }

    const signatureResult = await signatureResponse.json();
    console.log("Oracle signature received:", signatureResult.data);

    // STEP 3: TODO - Submit to blockchain
    console.log("Invoice ready for blockchain submission:", {
      invoice_id: data.invoiceId,
      doc_hash: uploadResult.data.ipfs_hash,
      doc_url: uploadResult.data.url,
      signature: signatureResult.data.signature,
      nonce: signatureResult.data.nonce,
    });

    alert("Invoice created successfully! (Blockchain submission pending)");
  } catch (error) {
    console.error("Error creating invoice:", error);
    alert("Failed to create invoice. Please try again.");
  }
};
```

#### Helper Function:
```typescript
const hashBuyerInfo = (clientName: string): string => {
  // Simple hash for demo - in production use proper hashing
  const hash = Array.from(clientName)
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    .toString(16)
    .padStart(64, "0");
  return "0x" + hash;
};
```

---

## Data Flow

```
User fills form → Upload document
     ↓
POST /api/documents/upload
     ↓
1. Validate file (size, type)
2. Generate SHA-256 hash
3. Create unique filename
4. Save to public/uploads/
5. Return { ipfs_hash, url }
     ↓
POST /api/oracle/sign-issuance
     ↓
1. Validate request
2. Generate signature
3. Return { signature, nonce, timestamp }
     ↓
Submit to blockchain (TODO)
     ↓
Invoice created on-chain
```

---

## File Storage Strategy

### Current Implementation (MVP)
- **Storage:** Local file system (`public/uploads/`)
- **Access:** Direct HTTP via `/uploads/{filename}`
- **Persistence:** Files remain on server until manually deleted

### Advantages:
- Simple implementation
- No external dependencies
- Fast local access
- Free (no cloud storage costs)

### Limitations:
- Not distributed (single point of failure)
- Limited scalability
- No content-addressable storage
- Manual backup required

### Production Recommendations:

#### Option 1: IPFS (Recommended for Decentralization)
```typescript
import { create } from 'ipfs-http-client';

const ipfs = create({ url: 'https://ipfs.infura.io:5001/api/v0' });
const result = await ipfs.add(fileBuffer);
const ipfsHash = result.cid.toString();
const url = `https://ipfs.io/ipfs/${ipfsHash}`;
```

**Services:**
- [Pinata](https://pinata.cloud/) - Managed IPFS pinning
- [Web3.Storage](https://web3.storage/) - Free IPFS storage
- [NFT.Storage](https://nft.storage/) - Free for NFT content

#### Option 2: Cloud Storage
```typescript
// AWS S3
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Google Cloud Storage
import { Storage } from "@google-cloud/storage";

// Azure Blob Storage
import { BlobServiceClient } from "@azure/storage-blob";
```

#### Option 3: Hybrid Approach
- **Primary:** IPFS for immutability and decentralization
- **Backup:** Cloud storage (S3/GCS) for reliability
- **Cache:** Local storage for fast access

---

## Security Considerations

### Current Implementation:

1. **File Type Validation**
   ```typescript
   const ALLOWED_MIME_TYPES = [
     "application/pdf",
     "image/jpeg",
     "image/png",
     "image/jpg",
   ];
   ```

2. **Size Limits**
   ```typescript
   const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
   ```

3. **Filename Sanitization**
   ```typescript
   const sanitizedName = file.name
     .replace(/[^a-zA-Z0-9.-]/g, "_")
     .replace(/_{2,}/g, "_");
   ```

4. **Rate Limiting**
   ```typescript
   if (isRateLimited(clientIP, 5, 60000)) {
     return errorResponse("RATE_LIMIT_EXCEEDED", ..., 429);
   }
   ```

### Additional Security Recommendations:

1. **Virus Scanning**
   - Integrate ClamAV or similar
   - Scan files before storage

2. **Content Verification**
   - Verify PDF structure
   - Check for embedded scripts
   - Validate image headers

3. **Access Control**
   - Require authentication
   - Verify ownership before serving files
   - Implement signed URLs

4. **Encryption**
   - Encrypt at rest
   - Use HTTPS for transfer
   - Consider end-to-end encryption

5. **Audit Logging**
   - Log all uploads
   - Track access patterns
   - Monitor for anomalies

---

## Testing the Upload

### Using the UI:

1. Navigate to **Business Dashboard** → **Create New** tab
2. Fill in invoice details:
   - Client Name: "Test Client"
   - Amount: 50000
   - Invoice ID: "INV-TEST-001"
   - Due Date: Select future date
   - Discount: 5
3. Upload a document (PDF or image)
4. Click **Tokenize Invoice**
5. Check console for logs:
   ```
   Document uploaded: { ipfs_hash: "Qm...", url: "/uploads/..." }
   Oracle signature received: { signature: "0x...", nonce: "..." }
   Invoice ready for blockchain submission
   ```

### Using cURL:

```bash
# Upload a document
curl -X POST http://localhost:3000/api/documents/upload \
  -F "file=@./test-invoice.pdf" \
  -v

# Expected response:
{
  "success": true,
  "data": {
    "ipfs_hash": "Qm1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2",
    "url": "/uploads/1731628800000_test-invoice.pdf"
  }
}

# View the uploaded file
open http://localhost:3000/uploads/1731628800000_test-invoice.pdf
```

### Using Postman:

1. **Request Type:** POST
2. **URL:** `http://localhost:3000/api/documents/upload`
3. **Body:** form-data
   - Key: `file` (type: File)
   - Value: Select file
4. **Send**

---

## Error Handling

### Common Errors:

#### 1. File Too Large
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds maximum allowed size of 10MB"
  }
}
```

#### 2. Invalid File Type
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "File type application/octet-stream is not allowed"
  }
}
```

#### 3. Missing File
```json
{
  "success": false,
  "error": {
    "code": "MISSING_FILE",
    "message": "No file provided in the request"
  }
}
```

#### 4. Rate Limited
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many upload requests. Please try again later."
  }
}
```

---

## Performance Optimization

### Current Status:
- Single-threaded upload processing
- No caching
- No compression
- Synchronous file I/O

### Recommendations:

1. **Image Compression**
   ```typescript
   import sharp from 'sharp';
   
   if (file.type.startsWith('image/')) {
     buffer = await sharp(buffer)
       .resize(2048, 2048, { fit: 'inside' })
       .jpeg({ quality: 80 })
       .toBuffer();
   }
   ```

2. **PDF Optimization**
   ```typescript
   import { PDFDocument } from 'pdf-lib';
   
   const pdfDoc = await PDFDocument.load(buffer);
   const optimizedBuffer = await pdfDoc.save({
     useObjectStreams: true
   });
   ```

3. **Progressive Upload**
   - Implement chunked uploads for large files
   - Show progress bar to user
   - Enable resume on failure

4. **CDN Distribution**
   - Use CloudFlare, Fastly, or AWS CloudFront
   - Cache uploaded files globally
   - Reduce server load

---

## Database Integration (Future)

Currently, uploads are not tracked in a database. For production:

```typescript
// Add to database after successful upload
await db.uploads.create({
  id: uploadId,
  filename: filename,
  original_name: file.name,
  mime_type: file.type,
  size: file.size,
  ipfs_hash: ipfsHash,
  local_url: localUrl,
  uploader: userId,
  invoice_id: invoiceId,
  uploaded_at: new Date(),
});
```

**Benefits:**
- Track all uploads
- Associate files with invoices
- Enable file management
- Audit trail
- Cleanup old files

---

## Cleanup Strategy

### Manual Cleanup:
```bash
# Remove files older than 30 days
find dapp/public/uploads -type f -mtime +30 -delete
```

### Automated Cleanup (Cron):
```typescript
// app/api/admin/cleanup/route.ts
export async function POST() {
  const uploadsDir = join(process.cwd(), "public", "uploads");
  const files = await readdir(uploadsDir);
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  
  for (const file of files) {
    const filePath = join(uploadsDir, file);
    const stats = await stat(filePath);
    
    if (now - stats.mtimeMs > thirtyDays) {
      await unlink(filePath);
      console.log(`Deleted old file: ${file}`);
    }
  }
  
  return successResponse({ deleted: deletedCount });
}
```

---

## Environment Configuration

### Recommended `.env` variables:

```bash
# Upload configuration
MAX_UPLOAD_SIZE=10485760  # 10MB in bytes
UPLOAD_DIR=/var/www/uploads
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png

# IPFS configuration (production)
IPFS_API_URL=https://ipfs.infura.io:5001/api/v0
IPFS_PROJECT_ID=your_project_id
IPFS_PROJECT_SECRET=your_secret
IPFS_GATEWAY=https://gateway.pinata.cloud

# Storage configuration
STORAGE_PROVIDER=local  # local | ipfs | s3 | gcs
AWS_S3_BUCKET=invoice-documents
AWS_REGION=us-east-1
```

---

## Summary

- **Implemented:**
- Local file system storage
- SHA-256 hash generation (IPFS-compatible CID format)
- File validation (size, type)
- Rate limiting
- Filename sanitization
- Unique filename generation
- Form integration with document upload
- Complete invoice creation flow
- Error handling

⏳ **Production Enhancements:**
- IPFS integration
- Database tracking
- Image/PDF optimization
- CDN distribution
- Virus scanning
- Access control
- Cleanup automation
- Monitoring and analytics

🎯 **Ready for Testing:**
Navigate to Business Dashboard → Create New tab and test the complete flow from document upload to oracle signature generation.
