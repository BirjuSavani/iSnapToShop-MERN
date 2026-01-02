import axios from "axios";
import DEFAULT_NO_IMAGE from "../../public/assets/default_icon_listing.png";

// Environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const GET_STATUS_API_URL = import.meta.env.VITE_GET_STATUS_API_URL || 'https://asia-south1.workflow.boltic.app/5e71a083-579e-4d69-b997-6e9789cc294c';
const company_id = import.meta.env.VITE_COMPANY_ID || '9095';
const application_id = import.meta.env.VITE_APPLICATION_ID || '672ddc7346bed2c768faf043';

//#region Axios setup
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

const getAuthConfig = (company_id, application_id) => ({
  params: { application_id, company_id },
});
//#endregion

export const fetchAnalyticsData = async (
  application_id,
  company_id,
  startDate,
  endDate,
  setAnalyticsData,
  setSearchTrendsChart
) => {
  if (!application_id || !company_id || !startDate || !endDate) return;

  try {
    const response = await apiClient.get(
      `/api/analytics/report?applicationId=${application_id}&companyId=${company_id}&startDate=${startDate}&endDate=${endDate}`
    );
    const data = response.data;

    let totalSearches = 0;
    let successfulMatches = 0;
    if (data.report && Array.isArray(data.report)) {
      data.report.forEach(item => {
        if (item._id === "image_search") {
          totalSearches += item.count;
          successfulMatches += item.count;
        }
      });
    }
    setAnalyticsData(prev => ({
      ...prev,
      totalSearches,
      successfulMatches,
      matchRate: parseFloat(data.matchRate) || 0,
      searchTrends: data.searchTrends || [],
      deviceBreakdown: data.deviceBreakdown || prev.deviceBreakdown,
    }));
    const searchTrends = data.searchTrends || [];
    setSearchTrendsChart({
      labels: searchTrends.map(item =>
        new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      ),
      datasets: [
        {
          label: "Searches",
          data: searchTrends.map(item => item.count),
          borderColor: "#6d47d9",
          backgroundColor: "rgba(109, 71, 217, 0.1)",
          pointBackgroundColor: "#6d47d9",
          pointBorderColor: "#fff",
          pointHoverRadius: 7,
          pointHoverBackgroundColor: "#6d47d9",
          fill: true,
          tension: 0.4,
        },
      ],
    });
  } catch (err) {
    console.error("Failed to fetch analytics:", err);
  }
};


export const toggleActiveStatus = async (
  isActive,
  isAutoActivate,
  application_id,
  setState
) => {
  try {
    if (isActive && isAutoActivate) return;
    setState(prev => ({
      ...prev,
      isInitializing: true,
      error: null,
      statusMessage: isAutoActivate
        ? "Setting up your shopping assistant..."
        : "Updating your settings...",
    }));

    const config = getAuthConfig(company_id, application_id);

    if (isActive && !isAutoActivate) {
      await apiClient.post("/api/platform/scan/remove-index", {}, config);
      setState(prev => ({
        ...prev,
        isActive: false,
        isInitializing: false,
        firstTimeVisit: false,
        error: null,
        previewImage: null,
        searchResults: [],
        statusMessage: "Shopping assistant is inactive",
      }));
    } else {
      await apiClient.post("/api/platform/scan/init-index", {}, config);
      const pollStatus = async () => {
        const maxRetries = 50;
        const interval = 3000;
        for (let i = 0; i < maxRetries; i++) {
          const res = await apiClient.get(
            "/api/platform/scan/index-status",
            config
          );
          if (res.data.status.status === "completed") return true;
          setState(prev => ({
            ...prev,
            statusMessage:
              i < 5 ? "Getting your product catalog ready..." : "Almost done! Just a moment...",
          }));
          await new Promise(r => setTimeout(r, interval));
        }
        throw new Error("Something went wrong during setup. Please try again.");
      };
      await pollStatus();
      setState(prev => ({
        ...prev,
        isActive: true,
        isInitializing: false,
        firstTimeVisit: false,
        error: null,
        searchResults: [],
        statusMessage: "Ready to search products!",
      }));
    }
  } catch (error) {
    console.error("Error toggling active status:", error);
    setState(prev => ({
      ...prev,
      isInitializing: false,
      firstTimeVisit: false,
      error:
        error.response?.data?.error ||
        (isActive ? "Failed to pause shopping assistant" : "Failed to start shopping assistant"),
      statusMessage: "Something went wrong. Please try again.",
    }));
  }
};

export const handleImageUpload = async (file, company_id, application_id, setState) => {
  if (!file) return;
  setState(prev => ({
    ...prev,
    isLoading: true,
    error: null,
    uploadProgress: 0,
    searchResults: [],
  }));
  try {
    const reader = new FileReader();
    reader.onload = e => setState(prev => ({ ...prev, previewImage: e.target.result }));
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append("image", file);
    const uploadConfig = {
      ...getAuthConfig(company_id, application_id),
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: progressEvent => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setState(prev => ({ ...prev, uploadProgress: progress }));
      },
    };

    const response = await apiClient.post(
      "/api/platform/scan/search-by-image",
      formData,
      uploadConfig
    );

    if (response.data.results.length === 0) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: "No matching products found. Try with a different image.",
        searchResults: [],
        uploadProgress: 100,
      }));
      return;
    }
    setState(prev => ({
      ...prev,
      isLoading: false,
      searchResults: response.data.results || [],
      uploadProgress: 100,
    }));
  } catch (error) {
    console.error("Failed to upload or search by image:", error);
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: "No matching products found. Try with a different image.",
    }));
  }
};

export const generateImageFromPrompt = async (
  prompt,
  setState,
  setIsGenerating,
  setPromptText,
  setShowImageModal
) => {
  try {
    setIsGenerating(true);
    const response = await apiClient.post(
      "/api/platform/scan/generate-prompts-to-image",
      { prompt },
      getAuthConfig(company_id, application_id)
    );
    const data = response.data;
    if (data.success && data.imageUrl) {
      const imageResponse = await axios.get(data.imageUrl, { responseType: "blob" });
      const imageBlob = imageResponse.data;
      const file = new File([imageBlob], "generated-image.png", {
        type: imageBlob.type || "image/png",
      });
      await handleImageUpload(file, company_id, application_id, setState);
      setPromptText("");
      setShowImageModal(false);
    } else {
      throw new Error("Image generation failed or imageUrl missing");
    }
  } catch (err) {
    console.error("Error generating/searching image:", err);
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: "Failed to generate or search for the image.",
    }));
  } finally {
    setIsGenerating(false);
  }
};

export const productProfileImage = media =>
  media?.find(m => m.type === "image")?.url || DEFAULT_NO_IMAGE;
