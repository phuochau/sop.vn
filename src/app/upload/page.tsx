import { UploadZone } from "@/components/UploadZone";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export default function Page() {
  return (
    <>
      <Nav variant="app" />
      <UploadZone />
      <Footer />
    </>
  );
}
