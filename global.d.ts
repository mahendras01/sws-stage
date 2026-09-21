declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

declare module "*.scss" {
  const content: { [className: string]: string };
  export default content;
}

// Minimal ambient module for pdfkit (untyped third-party lib)
declare module "pdfkit";
