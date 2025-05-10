
  // Add this property and getter/setter to the RealTimeTranslationService class
  private _wordCountThreshold: number = 10;
  
  // Getter and setter for wordCountThreshold
  public get wordCountThreshold(): number {
    return this._wordCountThreshold;
  }
  
  public set wordCountThreshold(value: number) {
    console.log(`Setting word count threshold to: ${value}`);
    this._wordCountThreshold = value;
  }
