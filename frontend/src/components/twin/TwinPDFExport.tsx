import { Button } from '../ui/Button';

export function TwinPDFExport() {
  const handleExport = () => {
    window.print();
  };
  return <Button variant="secondary" onClick={handleExport}>Export as PDF</Button>;
}
