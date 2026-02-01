import { cn } from "@/lib/utils";

describe("cn utility function", () => {
  it("should merge class names", () => {
    const result = cn("class1", "class2");
    expect(result).toBe("class1 class2");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base active");
  });

  it("should filter out falsy values", () => {
    const result = cn("base", false && "hidden", null, undefined, "visible");
    expect(result).toBe("base visible");
  });

  it("should handle object syntax", () => {
    const result = cn("base", { active: true, disabled: false });
    expect(result).toBe("base active");
  });

  it("should handle array syntax", () => {
    const result = cn(["class1", "class2"]);
    expect(result).toBe("class1 class2");
  });

  it("should merge Tailwind classes properly", () => {
    // tailwind-merge should keep the last conflicting class
    const result = cn("px-2 py-1", "px-4");
    expect(result).toBe("py-1 px-4");
  });

  it("should handle responsive Tailwind classes", () => {
    const result = cn("w-full", "md:w-1/2", "lg:w-1/3");
    expect(result).toBe("w-full md:w-1/2 lg:w-1/3");
  });

  it("should merge conflicting Tailwind utilities", () => {
    // text-red-500 should override text-blue-500
    const result = cn("text-blue-500", "text-red-500");
    expect(result).toBe("text-red-500");
  });

  it("should handle empty inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("should handle complex combinations", () => {
    const isError = true;
    const isDisabled = false;
    const result = cn(
      "base-class",
      "px-4 py-2",
      {
        "border-red-500": isError,
        "opacity-50 cursor-not-allowed": isDisabled,
      },
      isError && "text-red-500"
    );
    expect(result).toBe("base-class px-4 py-2 border-red-500 text-red-500");
  });
});
