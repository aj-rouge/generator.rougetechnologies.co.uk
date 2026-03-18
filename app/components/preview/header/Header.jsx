import ShippingNotice from "./ShippingNotice";
import StockNotice from "./StockNotice";
import Logo from "./Logo";
import DesktopNavigation from "./DesktopNavigation";
import MobileMenu from "./MobileMenu";

export default function Header() {
  return (
    <>
      <div className="rouge-technologies-header">
        <div className="rouge-technologies-header__inner">
          <ShippingNotice />
          <StockNotice />

          {/* Main Navigation with Logo */}
          <div className="rouge-technologies-main-header">
            <div className="rouge-technologies-container">
              <div className="rouge-technologies-navbar">
                <div className="rouge-technologies-navbar__content">
                  <Logo />
                  <DesktopNavigation />
                </div>
              </div>
            </div>

            {/* Mobile Menu (appears below logo like in the example) */}
            <MobileMenu />
          </div>
        </div>
      </div>
    </>
  );
}
