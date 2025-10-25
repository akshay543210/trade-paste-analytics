import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Image } from 'lucide-react';

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
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const pasteAreaRef = useRef<HTMLDivElement>(null);

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
  }, [onImageUploaded]);

  React.useEffect(() => {
    const element = pasteAreaRef.current;
    if (element) {
      element.addEventListener('paste', handlePaste);
      return () => element.removeEventListener('paste', handlePaste);
    }
  }, [handlePaste]);

  return (
    <div className="space-y-4">
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
        <Card
          ref={pasteAreaRef}
          className={`border-2 border-dashed transition-colors cursor-pointer ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          tabIndex={0}
        >
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className={`transition-colors ${dragActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {isUploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                ) : (
                  <Image className="h-12 w-12 mx-auto" />
                )}
              </div>
              
              {!isUploading && (
                <>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Paste Screenshot Here</h3>
                    <p className="text-sm text-muted-foreground">
                      Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+V</kbd> to paste an image
                      <br />
                      or drag and drop an image file
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
      )}
    </div>
  );
};