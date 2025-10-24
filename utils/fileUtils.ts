
import * as XLSX from 'xlsx';

export const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (extension === 'xlsx' || extension === 'xls') {
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    if (!firstSheetName) {
                        throw new Error("Excel file contains no sheets.");
                    }
                    const worksheet = workbook.Sheets[firstSheetName];
                    const csvData = XLSX.utils.sheet_to_csv(worksheet);
                    resolve(csvData);
                } catch (error) {
                    console.error("Error parsing Excel file:", error);
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        } else {
            // Fallback for text-based files like .csv, .json, .txt
            reader.onload = (e) => {
                resolve(e.target?.result as string);
            };
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        }
    });
};

export const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // remove "data:mime/type;base64," prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });