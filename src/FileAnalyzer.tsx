import { useState, useCallback, useEffect } from "react";
import EXIF from "exif-js";

type FileInfo = {
  name: string;
  size: number;
  type: string;
  lastModified: string;
  preview?: string;
  dimensions?: { width: number; height: number };
  exif?: any;
};

export function FileAnalyzer(props: { 
  onBack: () => void; 
  onLogout: () => void;
  initialFile?: File | null;
  mode?: string;
}) {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const getDecimalCoords = useCallback((coords: any, ref: string) => {
    if (!coords) return null;
    const degrees = coords[0].numerator / coords[0].denominator;
    const minutes = coords[1].numerator / coords[1].denominator;
    const seconds = coords[2].numerator / coords[2].denominator;
    let decimal = degrees + minutes / 60 + seconds / 3600;
    if (ref === "S" || ref === "W") decimal = -decimal;
    return decimal;
  }, []);

  const isMediaFile = (type: string, fileName: string) => {
    if (type.startsWith("image/") || type.startsWith("video/") || type.startsWith("audio/")) {
      return true;
    }
    const ext = fileName.toLowerCase().split('.').pop() || '';
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif'];
    const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'mkv', 'flv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac'];
    return imageExts.includes(ext) || videoExts.includes(ext) || audioExts.includes(ext);
  };

  const processSingleFile = useCallback((file: File) => {
    console.log("Starting to process file:", file.name, file.type);
    setIsAnalyzing(true);
    const info: FileInfo = {
      name: file.name,
      size: file.size,
      type: file.type || "unknown",
      lastModified: new Date(file.lastModified).toLocaleString(),
    };

    const processFile = (finalInfo: FileInfo) => {
      console.log("Processing complete, setting fileInfo:", finalInfo);
      setFileInfo(finalInfo);
      setIsAnalyzing(false);
    };

    const isImage = file.type.startsWith("image/") || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif'].includes(file.name.toLowerCase().split('.').pop() || '');
    
    if (isImage) {
      console.log("It's an image, extracting EXIF...");
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log("File reader onload");
        const src = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          console.log("Image loaded");
          let hasCalledBack = false;
          // Extract EXIF
          EXIF.getData(file as any, function(this: any) {
            console.log("EXIF callback called, got EXIF data:", this.exifdata);
            hasCalledBack = true;
            const allExif = EXIF.getAllTags(this);
            console.log("All EXIF tags:", allExif);
            processFile({
              ...info,
              preview: src,
              dimensions: { width: img.width, height: img.height },
              exif: allExif
            });
          });
          // Fallback in case EXIF callback is never called
          setTimeout(() => {
            if (!hasCalledBack) {
              console.log("EXIF callback not called, using fallback");
              processFile({
                ...info,
                preview: src,
                dimensions: { width: img.width, height: img.height }
              });
            }
          }, 500);
        };
        img.onerror = () => {
          console.log("Image failed to load");
          processFile(info);
        };
        img.src = src;
      };
      reader.onerror = () => {
        console.log("File reader failed");
        processFile(info);
      };
      reader.readAsDataURL(file);
    } else {
      console.log("Not an image, processing as non-image");
      if (file.type.startsWith("text/") || file.name.endsWith(".json") || file.name.endsWith(".md")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          console.log("Non-image file loaded");
          processFile({
            ...info,
            preview: (e.target?.result as string).slice(0, 2000),
          });
        };
        reader.onerror = () => {
          console.log("Non-image file reader failed");
          processFile(info);
        };
        reader.readAsText(file);
      } else {
        console.log("No preview available");
        processFile(info);
      }
    }
  }, []);

  useEffect(() => {
    if (props.initialFile) {
      processSingleFile(props.initialFile);
    }
  }, [props.initialFile, processSingleFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processSingleFile(file);
  }, [processSingleFile]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleGoogleLens = useCallback(() => {
    window.open("https://lens.google.com/", "_blank");
  }, []);

  const handleYandexImages = useCallback(() => {
    window.open("https://yandex.com/images/search?rpt=imageview", "_blank");
  }, []);

  const handleBingVisualSearch = useCallback(() => {
    window.open("https://www.bing.com/visualsearch", "_blank");
  }, []);

  const isMedia = fileInfo ? isMediaFile(fileInfo.type, fileInfo.name) : false;
  const lat = fileInfo?.exif?.GPSLatitude ? getDecimalCoords(fileInfo.exif.GPSLatitude, fileInfo.exif.GPSLatitudeRef) : null;
  const lon = fileInfo?.exif?.GPSLongitude ? getDecimalCoords(fileInfo.exif.GPSLongitude, fileInfo.exif.GPSLongitudeRef) : null;

  return (
    <div className="dashboard-container" style={{ padding: "2rem" }}>
      <div className="user-bar">
        <button type="button" onClick={props.onBack} style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}>
          ← Wróć do menu
        </button>
        <button type="button" onClick={props.onLogout} style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}>
          Wyloguj
        </button>
      </div>

      <h1>🔍 Analizator plików i metadanych</h1>
      <p className="hint">
        Podgląd plików, analiza EXIF i wyciąganie wniosków z metadanych.
      </p>

      <div className="auth-card" style={{ width: "100%", maxWidth: "600px", margin: "2rem 0" }}>
        <label className="field">
          Wybierz plik do analizy
          <input type="file" onChange={handleFileChange} style={{ marginTop: "0.5rem" }} disabled={isAnalyzing} />
        </label>
        {isAnalyzing && <p className="hint">Trwa analiza struktury pliku...</p>}
      </div>

      {fileInfo && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div className="auth-card" style={{ width: "100%" }}>
            <h3>Informacje o pliku</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.9rem" }}>
              <div><strong>Nazwa:</strong> {fileInfo.name}</div>
              <div><strong>Rozmiar:</strong> {formatSize(fileInfo.size)}</div>
              <div><strong>Typ MIME:</strong> {fileInfo.type}</div>
              <div><strong>Data modyfikacji:</strong> {fileInfo.lastModified}</div>
              {fileInfo.dimensions && (
                <div><strong>Wymiary:</strong> {fileInfo.dimensions.width}x{fileInfo.dimensions.height} px</div>
              )}
              
              {isMedia && fileInfo.exif?.DateTimeOriginal && (
                <div><strong>Data wykonania zdjęcia:</strong> {new Date(fileInfo.exif.DateTimeOriginal.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3")).toLocaleString("pl-PL", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              )}
              {isMedia && (fileInfo.exif?.Make || fileInfo.exif?.Model) && (
                <div><strong>Urządzenie:</strong> {`${fileInfo.exif?.Make || ""} ${fileInfo.exif?.Model || ""}`.trim()}</div>
              )}
              {isMedia && (fileInfo.exif?.LensMake || fileInfo.exif?.LensModel) && (
                <div><strong>Obiektyw:</strong> {`${fileInfo.exif?.LensMake || ""} ${fileInfo.exif?.LensModel || ""}`.trim()}</div>
              )}
              {isMedia && fileInfo.exif?.FNumber && (
                <div><strong>Przysłona:</strong> f/{(fileInfo.exif.FNumber.numerator / fileInfo.exif.FNumber.denominator).toFixed(1)}</div>
              )}
              {isMedia && fileInfo.exif?.ExposureTime && (
                <div><strong>Czas ekspozycji:</strong> {(() => {
                  const exposure = fileInfo.exif.ExposureTime.numerator / fileInfo.exif.ExposureTime.denominator;
                  return exposure < 1 ? `1/${Math.round(1/exposure)} s` : `${exposure.toFixed(1)} s`;
                })()}</div>
              )}
              {isMedia && fileInfo.exif?.ISOSpeedRatings && (
                <div><strong>ISO:</strong> {fileInfo.exif.ISOSpeedRatings}</div>
              )}
              {isMedia && fileInfo.exif?.FocalLength && (
                <div><strong>Długość ogniskowej:</strong> {`${(fileInfo.exif.FocalLength.numerator / fileInfo.exif.FocalLength.denominator).toFixed(0)} mm${fileInfo.exif.FocalLengthIn35mmFilm ? ` (35mm: ${fileInfo.exif.FocalLengthIn35mmFilm} mm)` : ""}`}</div>
              )}
              {isMedia && fileInfo.exif?.Flash && (
                <div><strong>Lampa błyskowa:</strong> {(() => {
                  const flashValue = fileInfo.exif.Flash;
                  let flashText = "nie użyto lampy";
                  if ((flashValue & 1) === 1) {
                    flashText = "użyto lampy błyskowej";
                    if ((flashValue & 6) === 2) {
                      flashText += ", nie wykryto światła odbitego";
                    } else if ((flashValue & 6) === 4) {
                      flashText += ", wykryto światło odbite";
                    }
                    if ((flashValue & 16) === 16) {
                      flashText += ", tryb wymuszenia lampy";
                    }
                    if ((flashValue & 32) === 32) {
                      flashText += ", tryb automatyczny";
                    }
                  }
                  return flashText;
                })()}</div>
              )}
              {isMedia && fileInfo.exif?.WhiteBalance && (
                <div><strong>Balans bieli:</strong> {fileInfo.exif.WhiteBalance === 0 ? "automatyczny" : "ręczny"}</div>
              )}
              {isMedia && fileInfo.exif?.Software && (
                <div><strong>Oprogramowanie:</strong> {fileInfo.exif.Software}{(() => {
                  const softwareLower = fileInfo.exif.Software.toLowerCase();
                  return softwareLower.includes("photoshop") || softwareLower.includes("gimp") || softwareLower.includes("canva") || softwareLower.includes("pixlr") ? " (manipulacja możliwa!)" : "";
                })()}</div>
              )}
              {isMedia && fileInfo.exif?.Orientation && (
                <div><strong>Orientacja zdjęcia:</strong> {(() => {
                  const orientations: Record<number, string> = {
                    1: "Normalna (0°)",
                    2: "Lustrzane odbicie poziome",
                    3: "Obrót o 180°",
                    4: "Lustrzane odbicie pionowe",
                    5: "Lustrzane odbicie poziome + obrót 270° CW",
                    6: "Obrót o 90° CW",
                    7: "Lustrzane odbicie poziome + obrót 90° CW",
                    8: "Obrót o 270° CW"
                  };
                  return orientations[fileInfo.exif.Orientation] || "nieznana";
                })()}</div>
              )}
              
              {isMedia && lat && lon && (
                <div>
                  <strong>Współrzędne GPS:</strong> {lat.toFixed(6)}, {lon.toFixed(6)}
                  <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <a 
                      href={`https://www.google.com/maps?q=${lat},${lon}&t=k`}
                      target="_blank" 
                      rel="noreferrer"
                      style={{ fontSize: "0.7rem", color: "#fff", textDecoration: "none", background: "#34a853", padding: "2px 6px", borderRadius: 3 }}
                    >
                      Google Maps
                    </a>
                    <a 
                      href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`}
                      target="_blank" 
                      rel="noreferrer"
                      style={{ fontSize: "0.7rem", color: "#fff", textDecoration: "none", background: "#7ebc6f", padding: "2px 6px", borderRadius: 3 }}
                    >
                      OpenStreetMap
                    </a>
                    <a 
                      href={`http://wikimapia.org/#lat=${lat}&lon=${lon}&z=18&m=b`}
                      target="_blank" 
                      rel="noreferrer"
                      style={{ fontSize: "0.7rem", color: "#fff", textDecoration: "none", background: "#900", padding: "2px 6px", borderRadius: 3 }}
                    >
                      Wikimapia
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="auth-card" style={{ width: "100%" }}>
            <h3>Podgląd zawartości</h3>
            <div style={{ background: "#050505", borderRadius: "4px", padding: "1rem", overflow: "auto", maxHeight: "500px" }}>
              {fileInfo.preview ? (
                (fileInfo.type.startsWith("image/") || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif'].includes(fileInfo.name.toLowerCase().split('.').pop() || '')) ? (
                  <div>
                    <img src={fileInfo.preview} alt="Podgląd" style={{ maxWidth: "100%", border: "1px solid #333" }} />
                    <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <p style={{ width: "100%", margin: "0 0 5px 0", fontSize: "0.75rem", opacity: 0.8 }}>Szukaj lokalizacji po zawartości:</p>
                      <button 
                        onClick={handleGoogleLens}
                        style={{ fontSize: "0.7rem", padding: "4px 8px" }}
                      >
                        Google Lens
                      </button>
                      <button 
                        onClick={handleYandexImages}
                        style={{ fontSize: "0.7rem", padding: "4px 8px" }}
                      >
                        Yandex Images
                      </button>
                      <button 
                        onClick={handleBingVisualSearch}
                        style={{ fontSize: "0.7rem", padding: "4px 8px" }}
                      >
                        Bing Visual Search
                      </button>
                    </div>
                  </div>
                ) : (
                  <pre style={{ margin: 0, fontSize: "0.75rem", whiteSpace: "pre-wrap", color: "#bdbdbd" }}>
                    {fileInfo.preview}
                    {fileInfo.preview.length >= 2000 && "\n... (obcięto)"}
                  </pre>
                )
              ) : (
                <p className="hint">Brak dostępnego podglądu dla tego typu pliku</p>
              )}
            </div>
          </div>
          
          {isMedia && fileInfo.exif && Object.keys(fileInfo.exif).length > 0 && (
            <div className="auth-card" style={{ width: "100%" }}>
              <h3>Surowe dane EXIF</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "0.5rem", fontSize: "0.75rem", opacity: 0.7 }}>
                {Object.entries(fileInfo.exif).map(([key, val]: [string, any]) => (
                  <div key={key} style={{ borderBottom: "1px solid #2a2a2a", paddingBottom: "2px" }}>
                    <strong>{key}:</strong> {typeof val === "object" ? JSON.stringify(val) : String(val)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
