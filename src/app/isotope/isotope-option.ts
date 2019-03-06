import { Subject } from 'rxjs';
import { t } from '@angular/core/src/render3';
/**
 * IsotopeOptions
 */
export class IsotopeOption {

  layoutMode = 'masonry';
  itemSelector: string;
  masonry: {
    columnWidth: number | string,
    gutter: number,
    horizontalOrder: boolean,
    fitWidth: boolean
  };
  percentPosition: boolean;
  stamp: string;
  originLeft = true;
  originTop = true;
  containerStyle: string;
  transitionDuration: string;
  resize: boolean;
  initLayout = true;
  layoutComplete: Subject<any> = new Subject<any>();

  constructor( options: any = null ) {

    if (!options) {
      return;
    }
    if ('layoutMode' in options) {
      this.layoutMode = options.layoutMode;
    }
    if ('itemSelector' in options) {
      this.itemSelector = options.itemSelector;
    }
    if ('masonry' in options) {
      this.masonry = options.masonry;
    }
    if ('percentPosition' in options) {
      this.percentPosition = options.percentPosition;
    }
    if ('stamp' in options) {
      this.stamp = options.stamp;
    }
    if ('originLeft' in options) {
      this.originLeft = options.originLeft;
    }
    if ('originTop' in options) {
      this.originTop = options.originTop;
    }
    if ('containerStyle' in options) {
      this.containerStyle = options.containerStyle;
    }
    if ('transitionDuration' in options) {
      this.transitionDuration = options.transitionDuration;
    }
    if ('resize' in options) {
      this.resize = options.resize;
    }
    if ('initLayout' in options) {
      this.initLayout = options.initLayout;
    }

  }

  public copy(): IsotopeOption {
    let newOption = new IsotopeOption();
    if (this.itemSelector) {
      newOption.itemSelector = this.itemSelector;
    }
    newOption.masonry = this.masonry;
    if (this.percentPosition !== null) {
      newOption.percentPosition = this.percentPosition;
    }
    if (this.stamp) {
      newOption.stamp = this.stamp;
    }
    if (this.originLeft !== null) {
      newOption.originLeft = this.originLeft;
    }
    if (this.originTop !== null) {
      newOption.originTop = this.originTop;
    }
    if (this.containerStyle) {
      newOption.containerStyle = this.containerStyle;
    }
    if (this.transitionDuration) {
      newOption.transitionDuration = this.transitionDuration;
    }
    if (this.resize !== null) {
      newOption.resize = this.resize;
    }
    if (this.initLayout !== null) {
      newOption.initLayout = this.initLayout;
    }
    newOption.layoutMode = this.layoutMode;
    newOption.layoutComplete = this.layoutComplete;
    return newOption;
  }

}
