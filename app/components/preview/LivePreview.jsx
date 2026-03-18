import Header from "./header/Header";
import ProductGallery from "./ProductGallery";
import ProductDetails from "./ProductDetails";
import Feedback from "./Feedback";
import Tabs from "./Tabs";
import Category from "./Category";
import Footer from "./Footer";
import PromotionGrid from "./PromotionGrid";
import "../../../css/livepreview.css";

const LivePreview = ({
  title,
  condition,
  images,
  paragraphs,
  features,
  note,
  feedbacks,
  seoSectionData,
  selectedCategory,
  ebayLink,
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
        <PromotionGrid
          selectedCategory={selectedCategory}
          ebayLink={ebayLink}
        />
        <Category
          categoryName={seoSectionData.name}
          categoryContent={seoSectionData.sections}
        />
        <Footer />
      </div>
    </div>
  );
};

export default LivePreview;
