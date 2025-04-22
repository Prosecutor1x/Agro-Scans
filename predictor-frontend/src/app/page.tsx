"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, Leaf, Info, Camera, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [prediction, setPrediction] = useState<string>("");
  const [imagePath, setImagePath] = useState<string>("");
  // const [plantType, setPlantType] = useState<string>("tomato");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [treatmentInfo, setTreatmentInfo] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      // Create a preview URL for the selected image
      const fileUrl = URL.createObjectURL(file);
      setPreviewUrl(fileUrl);
    }
  };

  // const startCamera = async () => {
  //   try {
  //     const stream = await navigator.mediaDevices.getUserMedia({
  //       video: { facingMode: { ideal: "environment" } },
  //     });

  //     if (videoRef.current) {
  //       videoRef.current.srcObject = stream;
  //       streamRef.current = stream;
  //       setShowCamera(true);
  //     }
  //   } catch (err) {
  //     console.error("Error accessing camera:", err);
  //     alert("Could not access camera. Please check permissions.");
  //   }
  // };

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setShowCamera(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);

      // Fallback if 'environment' mode not available
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          streamRef.current = fallbackStream;
          setShowCamera(true);
        }
      } catch (fallbackErr) {
        console.error("Fallback camera access also failed:", fallbackErr);
        alert("Could not access camera. Please check permissions.");
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // const captureImage = () => {
  //   if (videoRef.current && canvasRef.current) {
  //     const video = videoRef.current;
  //     const canvas = canvasRef.current;

  //     // Set canvas dimensions to match video
  //     canvas.width = video.videoWidth;
  //     canvas.height = video.videoHeight;

  //     // Draw the video frame to the canvas
  //     const ctx = canvas.getContext("2d");
  //     if (ctx) {
  //       ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  //       // Convert canvas to blob
  //       canvas.toBlob(
  //         (blob) => {
  //           if (blob) {
  //             // Create a File object from the blob
  //             const file = new File([blob], "camera-capture.jpg", {
  //               type: "image/jpeg",
  //             });
  //             setSelectedFile(file);

  //             // Create preview URL
  //             const fileUrl = URL.createObjectURL(blob);
  //             setPreviewUrl(fileUrl);

  //             // Stop the camera
  //             stopCamera();
  //           }
  //         },
  //         "image/jpeg",
  //         0.95
  //       );
  //     }
  //   }
  // };

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          async (blob) => {
            if (blob) {
              const file = new File([blob], `capture-${Date.now()}.jpg`, {
                type: "image/jpeg",
              });
              setSelectedFile(file);

              const fileUrl = URL.createObjectURL(blob);
              setPreviewUrl(fileUrl);

              stopCamera();

              // Upload immediately
              const formData = new FormData();
              formData.append("file", file);

              try {
                await axios.post(
                  "http://localhost:8000/upload_capture",
                  formData,
                  {
                    headers: {
                      "Content-Type": "multipart/form-data",
                    },
                  }
                );
                console.log("File uploaded successfully");
              } catch (error) {
                console.error("Error uploading captured image:", error);
              }
            }
          },
          "image/jpeg",
          0.95
        );
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("image", selectedFile);
    // formData.append("plant_type", plantType); // Send the selected plant type

    try {
      // Send the request directly to FastAPI backend
      const response = await axios.post(
        "http://localhost:8000/predict",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setPrediction(response.data.prediction);
      setImagePath(response.data.image_path);
      console.log("Prediction:", response.data.image_path);
    } catch (error) {
      console.error("Error during prediction:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // const handleKnowMore = async () => {
  //   try {
  //     const response = await axios.post("http://localhost:8000/know_more", {
  //       disease: prediction,
  //       // plant_type: plantType,
  //     });
  //     alert(`Treatment & Solution: ${response.data.summary}`);
  //   } catch (error) {
  //     console.error("Error fetching disease info:", error);
  //   }
  // };
  const handleKnowMore = async () => {
    try {
      setLoading(true);
      setTreatmentInfo(null); // Clear previous info
  
      const response = await axios.post("http://localhost:8000/know_more", {
        disease: prediction,
      });
  
      setTreatmentInfo(response.data.summary);
    } catch (error) {
      console.error("Error fetching disease info:", error);
      setTreatmentInfo("Sorry, something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-2 sm:p-4"
      style={{ backgroundImage: "url('hero.png')" }}
    >
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-4xl opacity-90">
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="text-center px-3 py-4 sm:px-6 sm:py-6">
            <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-800 flex items-center justify-center gap-2">
              <Leaf className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              Agro Scan
            </CardTitle>
            <p className="text-sm sm:text-base text-gray-600">
              Upload a plant leaf image to detect diseases
            </p>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                {/* <Label htmlFor="plant-type">Select Plant Type</Label> */}
                {/* <Select value={plantType} onValueChange={setPlantType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select plant type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tomato">Tomato</SelectItem>
                    <SelectItem value="potato">Potato</SelectItem>
                  </SelectContent>
                </Select> */}
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-upload">Upload Leaf Image</Label>
                <div className="grid gap-3 sm:gap-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-green-500 transition-colors cursor-pointer">
                    <input
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400 mb-2" />
                      <span className="text-xs sm:text-sm text-gray-500">
                        {selectedFile
                          ? selectedFile.name
                          : "Click to upload or drag and drop"}
                      </span>
                    </label>

                    {previewUrl && (
                      <div className="mt-4">
                        <img
                          src={previewUrl || "/placeholder.svg"}
                          alt="Preview"
                          className="max-h-36 sm:max-h-48 mx-auto rounded-md object-contain"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Dialog open={showCamera} onOpenChange={setShowCamera}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="flex items-center justify-center gap-2 border-green-600 text-green-600 hover:bg-green-50"
                          onClick={startCamera}
                        >
                          <Camera className="h-4 w-4" />
                          <span>Use Camera</span>
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="max-w-md w-full">
                        <DialogHeader>
                          <DialogTitle>Capture Photo</DialogTitle>
                          <DialogDescription>HEHEHEHE</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="relative">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              className="w-full h-auto rounded-lg border border-gray-300"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                              onClick={stopCamera}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <canvas ref={canvasRef} className="hidden" />

                          <Button
                            type="button"
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={captureImage}
                          >
                            Capture Photo
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!selectedFile || isLoading}
                    >
                      {isLoading ? "Analyzing..." : "Detect Disease"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
            {prediction && (
              <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-green-50 rounded-lg">
                <h3 className="text-lg sm:text-xl font-semibold text-green-800 mb-2">
                  Analysis Results
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    {/* <p className="text-sm sm:text-base text-gray-700 mb-2">
                      <span className="font-medium">Plant Type:</span>{" "}
                      {plantType.charAt(0).toUpperCase() + plantType.slice(1)}
                    </p> */}
                    <p className="text-sm sm:text-base text-gray-700 mb-4">
                      <span className="font-medium">Detected Condition:</span>{" "}
                      {prediction}
                    </p>
                    <Button
                      onClick={handleKnowMore}
                      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <Info className="h-4 w-4" />
                      Treatment Information
                    </Button>
                    {loading && (
                      <div className="mt-4 p-4 bg-yellow-50 rounded-lg text-yellow-800 text-center">
                        Fetching treatment information...
                      </div>
                    )}

                    {treatmentInfo && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <h4 className="text-md sm:text-lg font-semibold text-blue-800 mb-2">
                          Treatment & Solution
                        </h4>
                        <p className="text-sm sm:text-base text-gray-700">
                          {treatmentInfo}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center">
                    {imagePath && (
                      <img
                        src={imagePath || "../placeholder.svg"}
                        alt="Processed Image"
                        className="max-h-36 sm:max-h-48 rounded-md object-contain border border-gray-200"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
