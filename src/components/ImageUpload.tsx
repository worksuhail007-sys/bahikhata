'use client';

import { useState, useRef } from 'react';
import styles from './ImageUpload.module.css';

interface Props {
  onImageAction: (base64: string | undefined) => void;
  currentImage?: string;
}

export default function ImageUpload({ onImageAction, currentImage }: Props) {
  const [preview, setPreview] = useState<string | undefined>(currentImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 500) { // 500KB limit for LocalStorage safety
        alert('Image is too large. Please select an image under 500KB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreview(base64String);
        onImageAction(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setPreview(undefined);
    onImageAction(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={styles.uploadContainer}>
      {preview ? (
        <div className={styles.previewWrapper}>
          <img src={preview} alt="Preview" className={styles.preview} />
          <button type="button" className={styles.clearBtn} onClick={clearImage}>×</button>
        </div>
      ) : (
        <div className={styles.placeholder} onClick={() => fileInputRef.current?.click()}>
          <span>📷 Attach Photo</span>
          <p>Receipt or site proof</p>
        </div>
      )}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className={styles.hiddenInput} 
      />
    </div>
  );
}
