import React, { useRef, useState } from 'react';

interface FileUploadProps {
  label: string;
  icon: React.ReactNode;
  onFileLoaded: (content: string) => void;
  accept?: string;
  colorClass: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ label, icon, onFileLoaded, accept = ".csv", colorClass }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          onFileLoaded(text);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-gray-50 ${colorClass}`}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept={accept} 
        className="hidden" 
      />
      <div className="mb-3 text-4xl text-gray-400">
        {icon}
      </div>
      <h3 className="font-semibold text-gray-700 mb-1">{label}</h3>
      <p className="text-sm text-gray-500 text-center">
        {fileName ? (
            <span className="font-bold text-green-600">{fileName}</span>
        ) : (
            "Glissez un fichier CSV ou cliquez pour parcourir"
        )}
      </p>
    </div>
  );
};