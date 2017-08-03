import {Directive, ElementRef, Output, EventEmitter, HostListener} from '@angular/core';
import { LoggerService } from './logger-service';

@Directive({
    selector: '[clickOutside]'
})
export class ClickOutsideDirective {
    constructor(private _elementRef : ElementRef,
                private loggerService: LoggerService) {}

    @Output() public clickOutside = new EventEmitter();


    @HostListener('document:click', ['$event']) public onClick(event: any) {
      var targetElement = event.target;
      //console.log("event:", event)
      //console.log("targetElement:", targetElement);
      //console.log(this._elementRef);
        const clickedInside = this._elementRef.nativeElement.contains(targetElement);
        if (!clickedInside) {
            this.clickOutside.emit(null);
        }
        //else {
        //  console.log("clicked inside");
        //}
    }
}
