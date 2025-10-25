import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Image, FolderOpen, Camera, Link } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface PasteImageUploadProps {
  onImageUploaded: (url: string) => void;
  currentImageUrl?: string;
}

export const PasteImageUpload: React.FC<PasteImageUploadProps> = ({
  onImageUploaded,
  currentImageUrl,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [pasteReady, setPasteReady] = useState(false);
  const pasteAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (!user) return;

    setIsUploading(true);
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload an image file (PNG, JPG, etc.)',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Please upload an image smaller than 5MB',
          variant: 'destructive',
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('trade-screenshots')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('trade-screenshots')
        .getPublicUrl(fileName);

      onImageUploaded(data.publicUrl);
      toast({
        title: 'Image Uploaded',
        description: 'Screenshot uploaded successfully',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [user, onImageUploaded, toast]);

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await uploadFile(file);
          // Close upload options modal if open
          setShowUploadOptions(false);
        }
        break;
      }
    }
  }, [uploadFile]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFile(files[0]);
      // Close upload options modal if open
      setShowUploadOptions(false);
    }
  }, [uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const removeImage = useCallback(() => {
    onImageUploaded('');
    setImageUrl('');
  }, [onImageUploaded]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  }, [uploadFile]);

  const handleImageUrlSubmit = useCallback(() => {
    if (imageUrl.trim()) {
      onImageUploaded(imageUrl.trim());
      setImageUrl('');
      setShowUploadOptions(false);
      toast({
        title: 'Image URL Added',
        description: 'Image URL has been added successfully',
      });
    }
  }, [imageUrl, onImageUploaded, toast]);

  const openFileManager = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const openCamera = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  React.useEffect(() => {
    // Add paste listener to the document for global paste support
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Only handle paste if we're not in an input field or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      handlePaste(e);
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [handlePaste]);

  return (
    <div className="space-y-4">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {currentImageUrl ? (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <img
                src={currentImageUrl}
                alt="Trade screenshot"
                className="w-full max-h-64 object-contain rounded-lg"
                crossOrigin="anonymous"
                onError={(e) => {
                  console.error('Image failed to load:', currentImageUrl);
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                }}
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={removeImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card
            ref={pasteAreaRef}
            className={`border-2 border-dashed transition-colors cursor-pointer ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : pasteReady
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            tabIndex={0}
            onClick={() => setShowUploadOptions(true)}
          >
            <CardContent className="p-6 sm:p-8">
              <div className="text-center space-y-4">
                <div className={`transition-colors ${dragActive || pasteReady ? 'text-primary' : 'text-muted-foreground'}`}>
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  ) : (
                    <Image className="h-12 w-12 mx-auto" />
                  )}
                </div>
                
                {!isUploading && (
                  <>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-base sm:text-lg">
                        {pasteReady ? 'Ready to Paste!' : 'Upload Trade Screenshot'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {pasteReady ? (
                          <>
                            <span className="text-primary font-medium">Press Ctrl+V to paste your image</span>
                            <br />
                            <span className="text-xs">or click below for other options</span>
                          </>
                        ) : isMobile ? (
                          <>
                            Tap to choose upload method
                            <br />
                            or paste an image
                          </>
                        ) : (
                          <>
                            Press <kbd className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-mono">Ctrl+V</kbd> to paste an image
                            <br />
                            or drag and drop an image file
                          </>
                        )}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                      <Upload className="h-3 w-3" />
                      <span>PNG, JPG up to 5MB</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upload Options Modal */}
          {showUploadOptions && (
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Choose Upload Method</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowUploadOptions(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={openFileManager}
                    >
                      <FolderOpen className="h-6 w-6 text-primary" />
                      <span className="text-sm">From Device</span>
                      <span className="text-xs text-muted-foreground">Browse files</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={openCamera}
                    >
                      <Camera className="h-6 w-6 text-primary" />
                      <span className="text-sm">Take Photo</span>
                      <span className="text-xs text-muted-foreground">Use camera</span>
                    </Button>

                    <Button
                      variant="outline"
                      className={`h-auto p-4 flex flex-col items-center space-y-2 ${
                        pasteReady ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => {
                        setPasteReady(true);
                        toast({
                          title: 'Paste Ready',
                          description: 'Press Ctrl+V (Cmd+V on Mac) to paste an image from clipboard',
                        });
                        // Reset after 3 seconds
                        setTimeout(() => setPasteReady(false), 3000);
                      }}
                    >
                      <Image className={`h-6 w-6 ${pasteReady ? 'text-primary' : 'text-primary'}`} />
                      <span className="text-sm">Paste Image</span>
                      <span className="text-xs text-muted-foreground">Ctrl+V</span>
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="url"
                        placeholder="Or paste image URL..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-sm"
                      />
                    </div>
                    <Button
                      onClick={handleImageUrlSubmit}
                      disabled={!imageUrl.trim()}
                      className="w-full"
                      size="sm"
                    >
                      Add URL
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <kbd className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-mono">Ctrl+V</kbd>
                      <span>or</span>
                      <span>drag & drop files</span>
                    </div>
                    <p>You can paste images directly from your clipboard anywhere on this page</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};