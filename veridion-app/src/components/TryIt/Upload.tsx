import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import React, { useState } from "react";
const Upload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  /* UPLOADING */
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [result, setResult] = useState<Record<string, number>>({});

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus("No file selected");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    setUploadStatus("");

    try {
      const response = await fetch("http://localhost:3000/upload/csv", {
        method: "POST",
        body: formData,
      });

      if (response.status === 200) {
        const result = await response.json();
        setUploadSuccess(true);
        setUploadStatus(`Success`);
        setResult(result);
      } else {
        setUploadSuccess(false);
        setUploadStatus(`Upload failed with status: ${response.status}`);
      }
    } catch (error) {
      setUploadSuccess(false);
      setUploadStatus("Error during file upload");
    } finally {
      setIsUploading(false);
    }
  };
  return (
    <div className="grid xs:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
      <Card key={"upload"} className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-xl bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            {"Step 1:"}
          </CardTitle>
          <CardTitle>{"Upload domains"}</CardTitle>
          <CardTitle className="text-sm text-muted-foreground">
            {
              "Here you can upload the initial CSV (list of domains) OR a new CSV to update / index entries into the db."
            }
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Card>
            <CardContent className="p-6 space-x-4 flex flex-row">
              <div className="space-x-2 text-sm flex flex-row items-center">
                <Input
                  id="file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                />
              </div>
              <Button
                size="default"
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
            </CardContent>
          </Card>
        </CardContent>
        <CardFooter className="flex flex-row justify-center">
          {uploadStatus && (
            <p
              className={cn(
                "text-sm",
                uploadSuccess ? "text-green-600" : "text-red-500"
              )}
            >
              {uploadStatus}
            </p>
          )}
        </CardFooter>
      </Card>
      <section className="col-span-2 place-content-center">
        {result.status === 200 && (
          <div className="grid grid-cols-3 gap-8 place-content-center">
            <div className="space-y-2 text-center text-blue-500">
              <h2 className="text-3xl sm:text-4xl font-bold ">
                {result?.indexed}
              </h2>
              <p className="text-xl text-muted-foreground">{"Indexed"}</p>
            </div>
            <div className="space-y-2 text-center text-green-500">
              <h2 className="text-3xl sm:text-4xl font-bold ">
                {result?.updated}
              </h2>
              <p className="text-xl text-muted-foreground">{"Updated"}</p>
            </div>
            <div className="space-y-2 text-center text-red-500">
              <h2 className="text-3xl sm:text-4xl font-bold ">
                {result?.errored}
              </h2>
              <p className="text-xl text-muted-foreground">{"Errored"}</p>
            </div>
          </div>
        )}
        {result.status !== 200 && (
          <div className="text-red-500 text-center">{uploadStatus}</div>
        )}
      </section>
    </div>
  );
};

export default Upload;
