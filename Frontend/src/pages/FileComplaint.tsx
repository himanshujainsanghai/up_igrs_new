/**
 * File Complaint Page
 * Submit a new complaint using backend API
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Upload,
  X,
  CheckCircle,
  Loader2,
  FileText,
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin as MapPinIcon,
  Tag,
  MessageSquare,
  IdCard,
  Image as ImageIcon,
  Scan,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { complaintsService } from "@/services/complaints.service";
import { uploadService } from "@/services/upload.service";
import { aiService } from "@/services/ai.service";
import { COMPLAINT_CATEGORIES } from "@/lib/constants";
import { convertPdfToImages, isPdfFile } from "@/utils/pdfToImages";

interface Attachment {
  file: File;
  preview: string;
}

interface ScannedDocument {
  file: File;
  preview: string;
  name: string;
}

const FileComplaint: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedCategory = searchParams.get("category") || "";

  const [step, setStep] = useState<"form" | "success">("form");
  const [complaintId, setComplaintId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    title: "",
    description: "",
    category: preSelectedCategory || "",
    subCategory: "",
    voterId: "",
    location: "",
    latitude: 0,
    longitude: 0,
    city: "",
    locality: "",
    pincode: "",
    districtName: "",
    subdistrictName: "",
    villageName: "",
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"form" | "scan">("form");
  const [scanningDocument, setScanningDocument] = useState(false);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);

  // Batch scanning state
  const [scannedDocuments, setScannedDocuments] = useState<ScannedDocument[]>(
    []
  );
  const [processedDocs, setProcessedDocs] = useState<any>(null);

  // Set pre-selected category when page loads
  useEffect(() => {
    if (preSelectedCategory) {
      setFormData((prev) => ({ ...prev, category: preSelectedCategory }));
    }
  }, [preSelectedCategory]);

  // Helper function to get location with reverse geocoding
  const getLocationWithGeocoding = async (
    position: GeolocationPosition
  ): Promise<{
    latitude: number;
    longitude: number;
    location: string;
    city: string;
    locality: string;
    pincode: string;
    districtName: string;
    subdistrictName: string;
    villageName: string;
  }> => {
    try {
      const response = await fetch(
        `https://us1.locationiq.com/v1/reverse?key=pk.50401737fbb5b194c8b98d17ca08a79f&lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`
      );

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const data = await response.json();

      // Check if we have a valid response with address data
      if (!data || (!data.display_name && !data.address)) {
        throw new Error("Invalid response from geocoding service");
      }

      // Use display_name as primary source (pre-formatted address)
      let detectedArea = data.display_name;

      // If display_name is not available, construct from address object
      if (!detectedArea && data.address) {
        const addressParts = [
          data.address.hamlet,
          data.address.suburb,
          data.address.city,
          data.address.state,
          data.address.country,
        ]
          .filter(Boolean)
          .join(", ");

        detectedArea = addressParts || null;
      }

      // Extract address components for form fields
      const address = data.address || {};
      const city = address.city || address.town || address.village || "";
      const locality = address.suburb || address.hamlet || "";
      const pincode = address.postcode || "";

      // Extract district and subdistrict (tehsil)
      // In India, LocationIQ may return district in different fields:
      // - county (often contains district name)
      // - state_district (state-level district)
      // - district (direct district field)
      // - For subdistrict/tehsil: suburb, town, tehsil, subdistrict, or county
      let districtName =
        address.county || address.state_district || address.district || "";
      let subdistrictName =
        address.suburb ||
        address.town ||
        address.tehsil ||
        address.subdistrict ||
        "";

      // If county contains both district and subdistrict info, try to parse it
      // Sometimes county field contains "District, Subdistrict" format
      if (address.county && !districtName && !subdistrictName) {
        const countyParts = address.county
          .split(",")
          .map((s: string) => s.trim());
        if (countyParts.length >= 2) {
          districtName = countyParts[0];
          subdistrictName = countyParts[1];
        } else if (countyParts.length === 1) {
          districtName = countyParts[0];
        }
      }

      const villageName = address.village || address.hamlet || "";

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        location:
          detectedArea ||
          `Lat: ${position.coords.latitude.toFixed(
            4
          )}, Lng: ${position.coords.longitude.toFixed(4)}`,
        city,
        locality,
        pincode,
        districtName,
        subdistrictName,
        villageName,
      };
    } catch (error) {
      console.error("Geocoding error:", error);
      // Return coordinates even if geocoding fails
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        location: `Lat: ${position.coords.latitude.toFixed(
          4
        )}, Lng: ${position.coords.longitude.toFixed(4)}`,
        city: "",
        locality: "",
        pincode: "",
        districtName: "",
        subdistrictName: "",
        villageName: "",
      };
    }
  };

  const handleAutoDetectLocation = async () => {
    if (navigator.geolocation) {
      setDetectingLocation(true);
      toast.info("Detecting location... Please allow location access.");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const locationData = await getLocationWithGeocoding(position);

            setFormData((prev) => ({
              ...prev,
              ...locationData,
            }));

            if (locationData.districtName && locationData.subdistrictName) {
              toast.success(
                "Location detected. Your location has been auto-filled."
              );
            } else {
              toast.warning(
                "Location detected, but district/subdistrict could not be auto-filled. Please enter manually."
              );
            }
          } catch (error) {
            console.error("Location detection error:", error);
            toast.error("Unable to detect location. Please enter manually.");
          } finally {
            setDetectingLocation(false);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast.error(
            "Unable to detect location. Please allow location access or enter manually."
          );
          setDetectingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      toast.error(
        "Geolocation is not supported by your browser. Please enter your location manually."
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    const newAttachments: Attachment[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const handleRemoveAttachment = (index: number) => {
    const attachment = attachments[index];
    URL.revokeObjectURL(attachment.preview);
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDocumentScan = async (file: File) => {
    setScanningDocument(true);
    setScannedFile(file);
    try {
      // Process PDF files by converting to images first, then processing
      let result;
      if (isPdfFile(file)) {
        try {
          toast.info(`Converting PDF: ${file.name}`);
          const pdfResult = await convertPdfToImages(file, {
            scale: 2.0,
            format: "image/png",
          });

          // Process first page for single file scan (or all pages in batch)
          if (pdfResult.images.length > 0) {
            // For single file, process first page only
            result = await aiService.processDocument(pdfResult.images[0]);
          } else {
            throw new Error("PDF conversion resulted in no images");
          }
        } catch (error) {
          console.error(`Error processing PDF ${file.name}:`, error);
          toast.error(`Failed to process PDF: ${file.name}`);
          throw error;
        }
      } else {
        // Process image files directly
        result = await aiService.processDocument(file);
      }

      setScanResult(result);

      // Add scanned file to attachments (avoid duplicates)
      setAttachments((prev) => {
        const alreadyExists = prev.some(
          (att) => att.file.name === file.name && att.file.size === file.size
        );
        if (alreadyExists) {
          return prev;
        }
        const newAttachment: Attachment = {
          file,
          preview: URL.createObjectURL(file),
        };
        return [...prev, newAttachment];
      });

      // Auto-fill form fields if data is extracted
      if (result.data) {
        const data = result.data;
        let fieldsUpdated = 0;

        // Map name field
        if (data.name || data.contactName) {
          setFormData((prev) => ({
            ...prev,
            contactName: data.name || data.contactName,
          }));
          fieldsUpdated++;
        }

        // Map phone field
        if (data.phone || data.contactPhone) {
          setFormData((prev) => ({
            ...prev,
            contactPhone: data.phone || data.contactPhone,
          }));
          fieldsUpdated++;
        }

        // Map email field
        if (data.email || data.contactEmail) {
          setFormData((prev) => ({
            ...prev,
            contactEmail: data.email || data.contactEmail,
          }));
          fieldsUpdated++;
        }

        // Map location/address field
        if (data.location || data.address) {
          setFormData((prev) => ({
            ...prev,
            location: data.location || data.address,
          }));
          fieldsUpdated++;
        }

        // Map title field
        if (data.title || data.complaintTitle) {
          setFormData((prev) => ({
            ...prev,
            title: data.title || data.complaintTitle,
          }));
          fieldsUpdated++;
        }

        // Map description field
        if (data.description || data.complaintDescription) {
          setFormData((prev) => ({
            ...prev,
            description: data.description || data.complaintDescription,
          }));
          fieldsUpdated++;
        }

        // Map category field - validate against allowed categories
        if (data.category) {
          const categoryValue = data.category.toLowerCase().trim();
          const validCategories = COMPLAINT_CATEGORIES.map((c) => c.value);

          if (validCategories.includes(categoryValue)) {
            setFormData((prev) => ({ ...prev, category: categoryValue }));
            fieldsUpdated++;
          }
        }

        if (fieldsUpdated > 0) {
          toast.success(
            `Document scanned! ${fieldsUpdated} field${
              fieldsUpdated > 1 ? "s" : ""
            } auto-filled. File added to attachments.`
          );
          // Switch to form tab to show the filled data
          setTimeout(() => setActiveTab("form"), 500);
        } else {
          toast.info(
            "Document processed but no form fields could be auto-filled. File added to attachments."
          );
        }
      } else if (result.extractedText || result.text) {
        // If only text is extracted, fill description
        const extractedText = result.extractedText || result.text;
        setFormData((prev) => ({ ...prev, description: extractedText }));
        toast.success(
          "Text extracted from document! File added to attachments."
        );
        setTimeout(() => setActiveTab("form"), 500);
      } else {
        toast.info(
          "Document processed. File added to attachments. Please fill the form manually."
        );
      }
    } catch (error: any) {
      console.error("Document scan error:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to scan document"
      );
    } finally {
      setScanningDocument(false);
    }
  };

  // Handle scan file upload for single or batch processing
  const handleScanFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);

    // If single file, use existing single scan logic
    if (files.length === 1) {
      await handleDocumentScan(files[0]);
      return;
    }

    // For multiple files, add to batch queue
    const newDocuments: ScannedDocument[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));

    setScannedDocuments((prev) => [...prev, ...newDocuments]);
    toast.info(`${files.length} document(s) added to scanning queue`);
  };

  // Remove a document from scanning queue
  const handleRemoveScannedDocument = (index: number) => {
    const doc = scannedDocuments[index];
    URL.revokeObjectURL(doc.preview);
    setScannedDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  // Process all scanned documents in batch
  const handleSubmitAllScanned = async () => {
    if (scannedDocuments.length === 0) {
      toast.error("No documents to scan");
      return;
    }

    setScanningDocument(true);
    const filesToAddToAttachments: File[] = []; // Track all files to add as attachments

    try {
      // Step 1: Convert PDFs to images and collect all image files for AI processing
      const allImageFiles: File[] = [];

      for (const doc of scannedDocuments) {
        if (isPdfFile(doc.file)) {
          // Convert PDF to images
          try {
            toast.info(`Converting PDF: ${doc.file.name}`);
            const pdfResult = await convertPdfToImages(doc.file, {
              scale: 2.0,
              format: "image/png",
            });

            // Add all converted pages to the image array for AI processing
            allImageFiles.push(...pdfResult.images);

            // Also add the original PDF file to attachments (users might want the original PDF)
            filesToAddToAttachments.push(doc.file);
          } catch (error) {
            console.error(`Error converting PDF ${doc.file.name}:`, error);
            toast.error(`Failed to convert PDF: ${doc.file.name}`);
            // Add original PDF to attachments even if conversion fails
            filesToAddToAttachments.push(doc.file);
            // Continue with other files even if PDF conversion fails
          }
        } else {
          // Directly add image files for AI processing
          allImageFiles.push(doc.file);
          // Also add to attachments
          filesToAddToAttachments.push(doc.file);
        }
      }

      if (allImageFiles.length === 0) {
        toast.error("No valid images to process");
        setScanningDocument(false);
        return;
      }

      // Step 2: Process all images in batch with AI
      toast.info(`Processing ${allImageFiles.length} image(s) in batch...`);
      const result = await aiService.processDocumentsBatch(allImageFiles);

      // Step 3: Console log the response for debugging
      console.log("Batch processing response:", result);

      // Step 4: Save to processedDocs state
      setProcessedDocs(result);

      // Step 5: Add all files (original images + PDFs) to attachments
      // This ensures users can see and use the files in the complaint
      const newAttachments: Attachment[] = filesToAddToAttachments.map(
        (file) => ({
          file,
          preview: URL.createObjectURL(file),
        })
      );

      // Add new attachments to existing ones (avoid duplicates)
      setAttachments((prev) => {
        const existingFileNames = new Set(prev.map((att) => att.file.name));
        const uniqueNewAttachments = newAttachments.filter(
          (att) => !existingFileNames.has(att.file.name)
        );
        return [...prev, ...uniqueNewAttachments];
      });

      // Step 6: Convert formSuggestions to data format for auto-fill
      const mergedResult: any = {
        data: {},
        text: result.extractedText || "",
      };

      // Convert formSuggestions array to data object
      if (result.formSuggestions && Array.isArray(result.formSuggestions)) {
        result.formSuggestions.forEach((suggestion: any) => {
          if (suggestion.field && suggestion.value) {
            // Map common field names
            const fieldMap: Record<string, string> = {
              name: "contactName",
              phone: "contactPhone",
              email: "contactEmail",
              location: "location",
              description: "description",
              title: "title",
              category: "category",
              contactName: "contactName",
              contactPhone: "contactPhone",
              contactEmail: "contactEmail",
            };

            const mappedField = fieldMap[suggestion.field] || suggestion.field;
            mergedResult.data[mappedField] = suggestion.value;
          }
        });
      }

      // Step 7: Auto-fill form fields if data is extracted
      if (mergedResult.data && Object.keys(mergedResult.data).length > 0) {
        const data = mergedResult.data;

        if (data.contactName) {
          setFormData((prev) => ({ ...prev, contactName: data.contactName }));
        }
        if (data.contactPhone) {
          setFormData((prev) => ({ ...prev, contactPhone: data.contactPhone }));
        }
        if (data.contactEmail) {
          setFormData((prev) => ({ ...prev, contactEmail: data.contactEmail }));
        }
        if (data.location) {
          setFormData((prev) => ({ ...prev, location: data.location }));
        }
        if (data.title) {
          setFormData((prev) => ({ ...prev, title: data.title }));
        }
        if (data.description) {
          setFormData((prev) => ({ ...prev, description: data.description }));
        }
        if (data.category) {
          setFormData((prev) => ({ ...prev, category: data.category }));
        }

        toast.success(
          `${scannedDocuments.length} document(s) scanned successfully! Form fields have been auto-filled and files added to attachments.`
        );

        // Switch to form tab to show the filled data
        setTimeout(() => setActiveTab("form"), 500);
      } else if (mergedResult.text) {
        // If only text is extracted, fill description
        setFormData((prev) => ({ ...prev, description: mergedResult.text }));
        toast.success(
          "Text extracted from documents! Files added to attachments."
        );
        setTimeout(() => setActiveTab("form"), 500);
      } else {
        toast.info(
          "Documents processed. Files added to attachments. Please fill the form manually."
        );
      }

      // Step 8: Clear the scanned documents queue (cleanup preview URLs)
      scannedDocuments.forEach((doc) => URL.revokeObjectURL(doc.preview));
      setScannedDocuments([]);
    } catch (error: any) {
      console.error("Batch document scan error:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to scan documents. Please try again."
      );
    } finally {
      setScanningDocument(false);
    }
  };

  // Validation functions
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "contactName":
        if (!value.trim()) return "Name is required";
        if (value.trim().length < 2)
          return "Name must be at least 2 characters";
        if (value.trim().length > 100)
          return "Name cannot exceed 100 characters";
        return "";

      case "contactPhone":
        if (!value.trim()) return "Phone number is required";
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(value.trim())) {
          return "Please enter a valid 10-digit phone number starting with 6-9";
        }
        return "";

      case "contactEmail":
        if (value.trim()) {
          const emailRegex = /^\S+@\S+\.\S+$/;
          if (!emailRegex.test(value.trim())) {
            return "Please enter a valid email address";
          }
        }
        return "";

      case "title":
        if (!value.trim()) return "Title is required";
        if (value.trim().length < 5)
          return "Title must be at least 5 characters";
        if (value.trim().length > 255)
          return "Title cannot exceed 255 characters";
        return "";

      case "description":
        if (!value.trim()) return "Description is required";
        if (value.trim().length < 20)
          return "Description must be at least 20 characters";
        if (value.trim().length > 5000)
          return "Description cannot exceed 5000 characters";
        return "";

      case "category":
        if (!value) return "Category is required";
        const validCategories = [
          "roads",
          "water",
          "electricity",
          "documents",
          "health",
          "education",
        ];
        if (!validCategories.includes(value)) {
          return "Please select a valid category";
        }
        return "";

      case "subCategory":
        if (value.trim().length > 100)
          return "Sub-category cannot exceed 100 characters";
        return "";

      case "voterId":
        if (value.trim()) {
          const voterIdRegex = /^[A-Z0-9]+$/;
          if (!voterIdRegex.test(value.trim().toUpperCase())) {
            return "Voter ID must be alphanumeric (A-Z, 0-9)";
          }
          if (value.trim().length > 20)
            return "Voter ID cannot exceed 20 characters";
        }
        return "";

      case "location":
        if (value.trim().length > 500)
          return "Location cannot exceed 500 characters";
        return "";

      case "districtName":
        if (!value.trim()) return "District name is required";
        if (value.trim().length > 100)
          return "District name cannot exceed 100 characters";
        return "";

      case "subdistrictName":
        if (!value.trim()) return "Sub-district name is required";
        if (value.trim().length > 100)
          return "Sub-district name cannot exceed 100 characters";
        return "";

      case "villageName":
        if (value.trim().length > 200)
          return "Village name cannot exceed 200 characters";
        return "";

      case "city":
        if (value.trim().length > 100)
          return "City name cannot exceed 100 characters";
        return "";

      case "locality":
        if (value.trim().length > 100)
          return "Locality name cannot exceed 100 characters";
        return "";

      case "pincode":
        if (value.trim() && value.trim().length !== 6) {
          return "Pincode must be 6 digits";
        }
        if (value.trim() && !/^\d{6}$/.test(value.trim())) {
          return "Pincode must contain only numbers";
        }
        return "";

      case "latitude":
        if (typeof value === "string" && value.trim()) {
          const lat = parseFloat(value);
          if (isNaN(lat)) return "Latitude must be a valid number";
          if (lat < -90 || lat > 90)
            return "Latitude must be between -90 and 90";
        }
        return "";

      case "longitude":
        if (typeof value === "string" && value.trim()) {
          const lng = parseFloat(value);
          if (isNaN(lng)) return "Longitude must be a valid number";
          if (lng < -180 || lng > 180)
            return "Longitude must be between -180 and 180";
        }
        return "";

      default:
        return "";
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate all required fields
    const nameError = validateField("contactName", formData.contactName);
    if (nameError) newErrors.contactName = nameError;

    const phoneError = validateField("contactPhone", formData.contactPhone);
    if (phoneError) newErrors.contactPhone = phoneError;

    const emailError = validateField("contactEmail", formData.contactEmail);
    if (emailError) newErrors.contactEmail = emailError;

    const titleError = validateField("title", formData.title);
    if (titleError) newErrors.title = titleError;

    const descriptionError = validateField("description", formData.description);
    if (descriptionError) newErrors.description = descriptionError;

    const categoryError = validateField("category", formData.category);
    if (categoryError) newErrors.category = categoryError;

    const subCategoryError = validateField("subCategory", formData.subCategory);
    if (subCategoryError) newErrors.subCategory = subCategoryError;

    const voterIdError = validateField("voterId", formData.voterId);
    if (voterIdError) newErrors.voterId = voterIdError;

    const locationError = validateField("location", formData.location);
    if (locationError) newErrors.location = locationError;

    const districtError = validateField("districtName", formData.districtName);
    if (districtError) newErrors.districtName = districtError;

    const subdistrictError = validateField(
      "subdistrictName",
      formData.subdistrictName
    );
    if (subdistrictError) newErrors.subdistrictName = subdistrictError;

    const villageError = validateField("villageName", formData.villageName);
    if (villageError) newErrors.villageName = villageError;

    // Validate latitude
    if (!formData.latitude || formData.latitude === 0) {
      newErrors.latitude =
        "Latitude is required. Please allow location access or click the location button.";
    } else {
      const latError = validateField("latitude", String(formData.latitude));
      if (latError) newErrors.latitude = latError;
    }

    // Validate longitude
    if (!formData.longitude || formData.longitude === 0) {
      newErrors.longitude =
        "Longitude is required. Please allow location access or click the location button.";
    } else {
      const lngError = validateField("longitude", String(formData.longitude));
      if (lngError) newErrors.longitude = lngError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleBlur = (name: string, value: string) => {
    const error = validateField(name, value);
    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Helper function to ensure location is set and return updated form data
  const ensureLocationSet = async (
    currentData: typeof formData
  ): Promise<typeof formData | null> => {
    // Check if location is already set
    if (
      currentData.latitude &&
      currentData.latitude !== 0 &&
      currentData.longitude &&
      currentData.longitude !== 0
    ) {
      return currentData;
    }

    // Location not set, request it
    if (!navigator.geolocation) {
      toast.error(
        "Geolocation is not supported. Please use the location button to enter coordinates manually."
      );
      return null;
    }

    toast.info("Requesting location access... Please allow location access.");

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        }
      );

      // Get location with geocoding
      const locationData = await getLocationWithGeocoding(position);

      // Merge location data with current form data
      const updatedData = {
        ...currentData,
        ...locationData,
      };

      // Update form data with location
      setFormData(updatedData);

      // If district or subdistrict are missing, show warning
      if (!locationData.districtName || !locationData.subdistrictName) {
        toast.warning(
          "Location detected, but district/subdistrict could not be auto-filled. Please enter manually."
        );
      } else {
        toast.success("Location detected successfully!");
      }

      return updatedData;
    } catch (error: any) {
      console.error("Location request error:", error);
      toast.error(
        "Location access is required to submit a complaint. Please allow location access or click the location button."
      );
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);

    // Ensure location is set before proceeding
    let finalFormData = await ensureLocationSet(formData);
    if (!finalFormData) {
      setSubmitting(false);
      return;
    }

    // Create a validation function that uses the final data
    const validateCurrentForm = (data: typeof formData): boolean => {
      const newErrors: Record<string, string> = {};

      // Validate all required fields
      const nameError = validateField("contactName", data.contactName);
      if (nameError) newErrors.contactName = nameError;

      const phoneError = validateField("contactPhone", data.contactPhone);
      if (phoneError) newErrors.contactPhone = phoneError;

      const emailError = validateField("contactEmail", data.contactEmail);
      if (emailError) newErrors.contactEmail = emailError;

      const titleError = validateField("title", data.title);
      if (titleError) newErrors.title = titleError;

      const descriptionError = validateField("description", data.description);
      if (descriptionError) newErrors.description = descriptionError;

      const categoryError = validateField("category", data.category);
      if (categoryError) newErrors.category = categoryError;

      const subCategoryError = validateField("subCategory", data.subCategory);
      if (subCategoryError) newErrors.subCategory = subCategoryError;

      const voterIdError = validateField("voterId", data.voterId);
      if (voterIdError) newErrors.voterId = voterIdError;

      const locationError = validateField("location", data.location);
      if (locationError) newErrors.location = locationError;

      const districtError = validateField("districtName", data.districtName);
      if (districtError) newErrors.districtName = districtError;

      const subdistrictError = validateField(
        "subdistrictName",
        data.subdistrictName
      );
      if (subdistrictError) newErrors.subdistrictName = subdistrictError;

      const villageError = validateField("villageName", data.villageName);
      if (villageError) newErrors.villageName = villageError;

      // Validate latitude
      if (!data.latitude || data.latitude === 0) {
        newErrors.latitude =
          "Latitude is required. Please allow location access or click the location button.";
      } else {
        const latError = validateField("latitude", String(data.latitude));
        if (latError) newErrors.latitude = latError;
      }

      // Validate longitude
      if (!data.longitude || data.longitude === 0) {
        newErrors.longitude =
          "Longitude is required. Please allow location access or click the location button.";
      } else {
        const lngError = validateField("longitude", String(data.longitude));
        if (lngError) newErrors.longitude = lngError;
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    // Validate all fields
    if (!validateCurrentForm(finalFormData)) {
      toast.error("Please fix the errors in the form");
      setSubmitting(false);
      return;
    }

    try {
      // Upload files first
      const documentUrls: string[] = [];
      if (attachments.length > 0) {
        for (const attachment of attachments) {
          try {
            // Use uploadDocument for PDFs, uploadImage for images
            const isPDF =
              attachment.file.type === "application/pdf" ||
              attachment.file.name.toLowerCase().endsWith(".pdf");
            const uploadResult = isPDF
              ? await uploadService.uploadDocument(attachment.file)
              : await uploadService.uploadImage(attachment.file);
            documentUrls.push(uploadResult.url);
          } catch (error) {
            console.error("File upload error:", error);
            toast.error(`Failed to upload ${attachment.file.name}`);
          }
        }
      }

      // Create complaint
      // Note: complaintsService will transform to backend format (snake_case)
      // Build location string with address details
      let locationString = finalFormData.location.trim();
      if (
        finalFormData.city ||
        finalFormData.locality ||
        finalFormData.pincode
      ) {
        const addressParts = [
          locationString,
          finalFormData.locality ? `Locality: ${finalFormData.locality}` : "",
          finalFormData.city ? `City: ${finalFormData.city}` : "",
          finalFormData.pincode ? `Pincode: ${finalFormData.pincode}` : "",
        ].filter(Boolean);
        locationString = addressParts.join(" | ");
      }

      const complaintData: any = {
        contactName: finalFormData.contactName.trim(),
        contactPhone: finalFormData.contactPhone.trim(),
        contactEmail:
          finalFormData.contactEmail.trim() ||
          `${finalFormData.contactPhone.trim()}@temp.com`, // Backend requires email
        title: finalFormData.title.trim(),
        description: finalFormData.description.trim(),
        category: finalFormData.category as any,
        subCategory: finalFormData.subCategory.trim() || undefined,
        voterId: finalFormData.voterId.trim()?.toUpperCase() || undefined,
        location: locationString || "", // Backend expects string location (not object)
        latitude: finalFormData.latitude, // Latitude coordinate (required)
        longitude: finalFormData.longitude, // Longitude coordinate (required)
        districtName: finalFormData.districtName.trim(), // District name (required)
        subdistrictName: finalFormData.subdistrictName.trim(), // Sub-district name (required)
        villageName: finalFormData.villageName.trim() || undefined, // Optional: Village/town name
        documents: documentUrls.map((url) => ({
          _id: "",
          complaintId: "",
          fileName: "",
          fileUrl: url,
          fileType: "",
          fileSize: 0,
          uploadedBy: "",
          createdAt: new Date().toISOString(),
        })),
      };

      const complaint = await complaintsService.createComplaint(complaintData);
      // Backend returns MongoDB document with _id field
      setComplaintId(complaint._id || (complaint as any).id || "");
      setStep("success");
      toast.success("Complaint submitted successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit complaint");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep("form");
    setFormData({
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      title: "",
      description: "",
      category: preSelectedCategory || "",
      subCategory: "",
      voterId: "",
      location: "",
      latitude: 0,
      longitude: 0,
      city: "",
      locality: "",
      pincode: "",
      districtName: "",
      subdistrictName: "",
      villageName: "",
    });
    setErrors({});
    setAttachments([]);
    attachments.forEach((att) => URL.revokeObjectURL(att.preview));
    setAttachments([]);
    setComplaintId("");
    setActiveTab("form");
    setScannedFile(null);
    setScanResult(null);
    setScanningDocument(false);
    // Clear batch scanning state
    scannedDocuments.forEach((doc) => URL.revokeObjectURL(doc.preview));
    setScannedDocuments([]);
    setProcessedDocs(null);
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-8 md:py-12">
        <div className="container mx-auto max-w-6xl px-4">
          <Card className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 md:p-8 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold mb-2">
                    Thank You!
                  </h1>
                  <p className="text-green-100 text-sm md:text-base">
                    Your complaint has been successfully registered.
                  </p>
                </div>
              </div>
            </div>
            <CardContent className="p-6 md:p-8">
              <div className="text-center space-y-6">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-base text-gray-700">
                    We've received your complaint and will review it shortly.
                  </p>
                  <p className="text-sm text-gray-600">
                    You'll receive updates on your registered phone number and
                    email.
                  </p>
                  {complaintId && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 inline-block">
                      <p className="text-xs text-gray-500 mb-1">Complaint ID</p>
                      <p className="text-sm font-mono font-semibold text-gray-900">
                        {complaintId}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    onClick={() => navigate("/")}
                    variant="outline"
                    className="flex-1 border-gray-300 hover:bg-gray-50 h-12 text-base font-semibold"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Home
                  </Button>
                  <Button
                    onClick={handleReset}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    File Another Complaint
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-4 md:py-6">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Header Section with Gradient */}
        <div className="mb-4">
          <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl p-4 md:p-6 text-gray-800 shadow-lg border border-gray-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-300 rounded-lg">
                  <FileText className="w-6 h-6 md:w-7 md:h-7 text-gray-700" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold mb-1 text-gray-900">
                    File a New Complaint
                  </h1>
                  <p className="text-gray-600 text-xs md:text-sm">
                    Provide details about your issue. All fields marked with *
                    are required.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="text-gray-700 hover:bg-gray-300 hidden md:flex"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>

        {/* Main Complaint Form Card */}
        <Card className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <CardContent className="p-4 md:p-6">
            {/* Mobile Back Button */}
            <div className="md:hidden mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>

            {/* Tabs for Form and Document Scan */}
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as "form" | "scan")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="form" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Fill Form
                </TabsTrigger>
                <TabsTrigger value="scan" className="flex items-center gap-2">
                  <Scan className="w-4 h-4" />
                  Scan Document
                </TabsTrigger>
              </TabsList>

              {/* Document Scan Tab */}
              <TabsContent value="scan" className="space-y-4">
                <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                        <Scan className="w-8 h-8 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          Scan Your Document
                        </h3>
                        <p className="text-sm text-gray-600">
                          Upload a document (PDF, Image) or take a photo to
                          automatically extract information and fill the form
                        </p>
                      </div>

                      {scanningDocument ? (
                        <div className="flex flex-col items-center gap-3 py-6">
                          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                          <p className="text-sm text-gray-600">
                            Scanning document...
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="border-2 border-dashed border-orange-300 rounded-lg p-8 bg-white hover:border-orange-400 transition-colors">
                            <input
                              type="file"
                              id="scan-file-upload"
                              accept="image/*,.pdf"
                              onChange={handleScanFileUpload}
                              className="hidden"
                              multiple
                            />
                            <label
                              htmlFor="scan-file-upload"
                              className="cursor-pointer flex flex-col items-center justify-center space-y-3"
                            >
                              <div className="p-4 bg-orange-100 rounded-full">
                                <Camera className="w-8 h-8 text-orange-600" />
                              </div>
                              <div className="text-center">
                                <p className="font-semibold text-gray-700 mb-1">
                                  Click to upload or take photos
                                </p>
                                <p className="text-xs text-gray-500">
                                  PDF, JPG, PNG (Max 10MB) - Select multiple
                                  files for batch scanning
                                </p>
                              </div>
                            </label>
                          </div>

                          {/* Batch Scanning Queue */}
                          {scannedDocuments.length > 0 && (
                            <Card className="border-blue-200 bg-blue-50">
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-blue-800">
                                      Scanned Documents Queue (
                                      {scannedDocuments.length})
                                    </p>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={handleSubmitAllScanned}
                                      disabled={scanningDocument}
                                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                                    >
                                      {scanningDocument ? (
                                        <>
                                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                          Processing...
                                        </>
                                      ) : (
                                        <>
                                          <Scan className="w-3 h-3 mr-1" />
                                          Scan All
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                  <div className="space-y-2">
                                    {scannedDocuments.map((doc, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center gap-2 bg-white rounded p-2 border border-blue-200"
                                      >
                                        <ImageIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                        <span className="text-xs text-gray-700 flex-1 truncate">
                                          {doc.name}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveScannedDocument(index)
                                          }
                                          className="p-1 hover:bg-red-100 rounded text-red-600"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {scannedFile && scanResult && (
                            <Card className="border-green-200 bg-green-50">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-green-800 mb-1">
                                      Document Scanned Successfully
                                    </p>
                                    <p className="text-xs text-green-700 mb-2">
                                      {scannedFile.name} - Form fields have been
                                      auto-filled.
                                    </p>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-8 border-green-300 text-green-700 hover:bg-green-100"
                                      onClick={() => setActiveTab("form")}
                                    >
                                      Review Form
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          <div className="pt-4 border-t">
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full"
                              onClick={() => setActiveTab("form")}
                            >
                              <ArrowLeft className="w-4 h-4 mr-2" />
                              Go to Form
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Form Tab */}
              <TabsContent value="form">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Personal Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <div className="p-1.5 bg-gray-100 rounded-lg">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <h2 className="text-base font-bold text-gray-800">
                        Personal Information
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Full Name */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="name"
                          className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"
                        >
                          <User className="w-3.5 h-3.5 text-gray-600" />
                          Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={formData.contactName}
                          onChange={(e) =>
                            handleFieldChange("contactName", e.target.value)
                          }
                          onBlur={(e) =>
                            handleBlur("contactName", e.target.value)
                          }
                          placeholder="Enter your full name (2-100 characters)"
                          className={`bg-gray-50 h-10 ${
                            errors.contactName
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          }`}
                          required
                        />
                        {errors.contactName && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <span>⚠</span> {errors.contactName}
                          </p>
                        )}
                      </div>

                      {/* Phone Number */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="phone"
                          className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5 text-gray-600" />
                          Phone Number <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.contactPhone}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, ""); // Only numbers
                            handleFieldChange("contactPhone", value);
                          }}
                          onBlur={(e) =>
                            handleBlur("contactPhone", e.target.value)
                          }
                          placeholder="10-digit phone number (starts with 6-9)"
                          maxLength={10}
                          className={`bg-gray-50 h-10 ${
                            errors.contactPhone
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          }`}
                          required
                        />
                        {errors.contactPhone && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <span>⚠</span> {errors.contactPhone}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="email"
                          className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"
                        >
                          <Mail className="w-3.5 h-3.5 text-gray-600" />
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.contactEmail}
                          onChange={(e) =>
                            handleFieldChange("contactEmail", e.target.value)
                          }
                          onBlur={(e) =>
                            handleBlur("contactEmail", e.target.value)
                          }
                          placeholder="your.email@example.com"
                          className={`bg-gray-50 h-10 ${
                            errors.contactEmail
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          }`}
                        />
                        {errors.contactEmail ? (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <span>⚠</span> {errors.contactEmail}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">
                            If not provided, a temporary email will be
                            generated.
                          </p>
                        )}
                      </div>

                      {/* Location */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="location"
                          className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"
                        >
                          <MapPinIcon className="w-3.5 h-3.5 text-gray-600" />
                          Location
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) =>
                              handleFieldChange("location", e.target.value)
                            }
                            onBlur={(e) =>
                              handleBlur("location", e.target.value)
                            }
                            placeholder="Enter location or auto-detect (max 500 characters)"
                            className={`bg-gray-50 flex-1 h-10 ${
                              errors.location
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            }`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAutoDetectLocation}
                            disabled={detectingLocation}
                            title="Auto-detect location from map"
                            className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 h-10 px-3"
                          >
                            {detectingLocation ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                            ) : (
                              <MapPin className="w-4 h-4 text-gray-600" />
                            )}
                          </Button>
                        </div>
                        {errors.location ? (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <span>⚠</span> {errors.location}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">
                            Click the map icon to automatically detect your
                            location from GPS.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Address Details (Auto-filled from map) */}
                  {(formData.city || formData.locality || formData.pincode) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="space-y-2">
                        <Label
                          htmlFor="city"
                          className="text-xs font-medium text-gray-600"
                        >
                          City
                        </Label>
                        <Input
                          id="city"
                          value={formData.city}
                          readOnly
                          className="bg-white border-gray-300"
                          placeholder="Auto-detected from map"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="locality"
                          className="text-xs font-medium text-gray-600"
                        >
                          Locality
                        </Label>
                        <Input
                          id="locality"
                          value={formData.locality}
                          readOnly
                          className="bg-white border-gray-300"
                          placeholder="Auto-detected from map"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="pincode"
                          className="text-xs font-medium text-gray-600"
                        >
                          Pincode
                        </Label>
                        <Input
                          id="pincode"
                          value={formData.pincode}
                          readOnly
                          className="bg-white border-gray-300"
                          placeholder="Auto-detected from map"
                        />
                      </div>
                    </div>
                  )}

                  {/* Administrative Location Section */}
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                      <div className="p-1.5 bg-blue-100 rounded-lg">
                        <MapPinIcon className="w-4 h-4 text-blue-600" />
                      </div>
                      <h3 className="text-sm font-bold text-blue-900">
                        Administrative Location
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* District Name */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="districtName"
                          className="text-xs font-semibold text-gray-700 flex items-center gap-1"
                        >
                          District <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="districtName"
                          value={formData.districtName}
                          onChange={(e) =>
                            handleFieldChange("districtName", e.target.value)
                          }
                          onBlur={(e) =>
                            handleBlur("districtName", e.target.value)
                          }
                          placeholder="Enter district name"
                          className={`bg-white h-10 ${
                            errors.districtName
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          }`}
                        />
                        {errors.districtName && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <span>⚠</span> {errors.districtName}
                          </p>
                        )}
                      </div>

                      {/* Sub-District Name */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="subdistrictName"
                          className="text-xs font-semibold text-gray-700 flex items-center gap-1"
                        >
                          Sub-District / Tehsil{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="subdistrictName"
                          value={formData.subdistrictName}
                          onChange={(e) =>
                            handleFieldChange("subdistrictName", e.target.value)
                          }
                          onBlur={(e) =>
                            handleBlur("subdistrictName", e.target.value)
                          }
                          placeholder="Enter sub-district/tehsil"
                          className={`bg-white h-10 ${
                            errors.subdistrictName
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          }`}
                        />
                        {errors.subdistrictName && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <span>⚠</span> {errors.subdistrictName}
                          </p>
                        )}
                      </div>

                      {/* Village Name */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="villageName"
                          className="text-xs font-semibold text-gray-700"
                        >
                          Village / Town (Optional)
                        </Label>
                        <Input
                          id="villageName"
                          value={formData.villageName}
                          onChange={(e) =>
                            handleFieldChange("villageName", e.target.value)
                          }
                          onBlur={(e) =>
                            handleBlur("villageName", e.target.value)
                          }
                          placeholder="Enter village/town name"
                          className={`bg-white h-10 ${
                            errors.villageName
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          }`}
                        />
                        {errors.villageName && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <span>⚠</span> {errors.villageName}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Complaint Details Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <div className="p-1.5 bg-gray-100 rounded-lg">
                        <MessageSquare className="w-4 h-4 text-gray-600" />
                      </div>
                      <h2 className="text-base font-bold text-gray-800">
                        Complaint Details
                      </h2>
                    </div>

                    {/* Complaint Title - Full Width */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="title"
                        className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-gray-600" />
                        Complaint Title <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) =>
                          handleFieldChange("title", e.target.value)
                        }
                        onBlur={(e) => handleBlur("title", e.target.value)}
                        placeholder="Brief title of your complaint (5-255 characters)"
                        className={`bg-gray-50 h-10 ${
                          errors.title
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                        }`}
                        required
                      />
                      {errors.title && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <span>⚠</span> {errors.title}
                        </p>
                      )}
                      {!errors.title && formData.title && (
                        <p className="text-xs text-gray-500">
                          {formData.title.length}/255 characters
                        </p>
                      )}
                    </div>

                    {/* Category & Sub-Category - Two Column */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="category"
                          className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"
                        >
                          <Tag className="w-3.5 h-3.5 text-gray-600" />
                          Category <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => {
                            handleFieldChange("category", value);
                            // Clear error when category is selected
                            if (errors.category) {
                              setErrors((prev) => {
                                const newErrors = { ...prev };
                                delete newErrors.category;
                                return newErrors;
                              });
                            }
                          }}
                          required
                        >
                          <SelectTrigger
                            className={`bg-gray-50 h-10 ${
                              errors.category
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            }`}
                          >
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {COMPLAINT_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.category && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <span>⚠</span> {errors.category}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="subCategory"
                          className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"
                        >
                          <Tag className="w-3.5 h-3.5 text-gray-400" />
                          Sub-Category (Optional)
                        </Label>
                        <Input
                          id="subCategory"
                          value={formData.subCategory}
                          onChange={(e) =>
                            handleFieldChange("subCategory", e.target.value)
                          }
                          onBlur={(e) =>
                            handleBlur("subCategory", e.target.value)
                          }
                          placeholder="Optional sub-category (max 100 characters)"
                          maxLength={100}
                          className={`bg-gray-50 h-10 ${
                            errors.subCategory
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          }`}
                        />
                        {errors.subCategory && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <span>⚠</span> {errors.subCategory}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Description - Full Width */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="description"
                        className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-gray-600" />
                        Description <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          handleFieldChange("description", e.target.value)
                        }
                        onBlur={(e) =>
                          handleBlur("description", e.target.value)
                        }
                        placeholder="Describe your complaint in detail (20-5000 characters)..."
                        rows={5}
                        className={`bg-gray-50 resize-none ${
                          errors.description
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                        }`}
                        required
                      />
                      {errors.description && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <span>⚠</span> {errors.description}
                        </p>
                      )}
                      {!errors.description && formData.description && (
                        <p
                          className={`text-xs ${
                            formData.description.length < 20
                              ? "text-yellow-600"
                              : formData.description.length > 5000
                              ? "text-red-500"
                              : "text-gray-500"
                          }`}
                        >
                          {formData.description.length}/5000 characters (minimum
                          20 required)
                        </p>
                      )}
                    </div>

                    {/* Voter ID - Full Width */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="voterId"
                        className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"
                      >
                        <IdCard className="w-3.5 h-3.5 text-gray-600" />
                        Voter ID (Optional)
                      </Label>
                      <Input
                        id="voterId"
                        value={formData.voterId}
                        onChange={(e) => {
                          const value = e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, "");
                          handleFieldChange("voterId", value);
                        }}
                        onBlur={(e) => handleBlur("voterId", e.target.value)}
                        placeholder="ABC1234567 (alphanumeric, max 20 characters)"
                        maxLength={20}
                        className={`bg-gray-50 h-10 ${
                          errors.voterId
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                        }`}
                      />
                      {errors.voterId && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <span>⚠</span> {errors.voterId}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* File Attachments Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <div className="p-1.5 bg-gray-100 rounded-lg">
                        <ImageIcon className="w-4 h-4 text-gray-600" />
                      </div>
                      <h2 className="text-base font-bold text-gray-800">
                        Attachments (Optional)
                      </h2>
                    </div>

                    <div className="space-y-3">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          id="file-upload"
                          multiple
                          accept="image/*,.pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                        >
                          <div className="p-3 bg-white rounded-full shadow-md">
                            <Upload className="w-6 h-6 text-gray-600" />
                          </div>
                          <div className="text-center">
                            <span className="text-sm font-semibold text-gray-700 block mb-1">
                              Click to upload or drag and drop
                            </span>
                            <span className="text-xs text-gray-500">
                              Photos, PDFs or Documents (Max 10MB per file)
                            </span>
                          </div>
                        </label>
                      </div>
                      {attachments.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {attachments.map((attachment, index) => (
                            <div key={index} className="relative group">
                              {attachment.file.type.startsWith("image/") ? (
                                <div className="relative">
                                  <img
                                    src={attachment.preview}
                                    alt={`Attachment ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors" />
                                </div>
                              ) : (
                                <div className="w-full h-24 border-2 border-gray-200 rounded-lg flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm">
                                  <FileText className="w-6 h-6 text-gray-600 mb-1" />
                                  <span className="text-xs text-gray-600 truncate px-1">
                                    {attachment.file.name}
                                  </span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(index)}
                                className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/")}
                      className="flex-1 border-gray-300 hover:bg-gray-50 h-11 text-sm font-semibold"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-11 text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Submit Complaint
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FileComplaint;
