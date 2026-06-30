// components/preview/LivePreview.tsx
import React from "react";
import Header from "./header/Header";
import ProductGallery from "./ProductGallery";
import ProductDetails from "./ProductDetails";
import Feedback from "./Feedback";
import Tabs from "./Tabs";
import Category from "./Category";
import Footer from "./Footer";
import PromotionGrid from "./PromotionGrid";

interface LivePreviewProps {
  title: string;
  condition: string;
  images: Array<{ url: string; [key: string]: any }> | string[];
  paragraphs: any[];
  features: Array<{ title: string; description: string }>;
  note?: string;
  feedbacks: any[];
  categoryContent: {
    ebayStoreLink?: string;
    content?: any[];
    categoryName?: string;
  } | null;
  categoryName: string;
}

const LivePreview: React.FC<LivePreviewProps> = ({
  title,
  condition,
  images,
  paragraphs,
  features,
  note,
  feedbacks,
  categoryContent,
  categoryName,
}) => {
  return (
    <div className="rouge-technologies-live-preview">
      <Header />
      <div className="rouge-technologies-live-preview__content">
        <div className="rouge-technologies-live-preview__title-wrapper">
          <h4 className="rouge-technologies-live-preview__title">{title}</h4>
        </div>
        <div className="rouge-technologies-live-preview__layout">
          <div className="rouge-technologies-live-preview__grid">
            <ProductGallery title={title} images={images} />
            <ProductDetails
              condition={condition}
              paragraphs={paragraphs}
              features={features}
              note={note}
            />
          </div>
        </div>
        <Feedback feedbacks={feedbacks} />
        <Tabs />
        <PromotionGrid ebayLink={categoryContent?.ebayStoreLink} />
        <Category
          categoryName={categoryName}
          categoryContent={categoryContent?.content || []}
        />
        <Footer />
      </div>
    </div>
  );
};

export default LivePreview;
