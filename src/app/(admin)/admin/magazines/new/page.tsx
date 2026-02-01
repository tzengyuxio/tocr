import { MagazineForm } from "@/components/magazine/MagazineForm";

export default function NewMagazinePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <MagazineForm mode="create" />
    </div>
  );
}
