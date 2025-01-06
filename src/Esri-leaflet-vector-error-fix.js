/**
 * This is a fix for the error:
 * Uncaught TypeError: Cannot read property '_leaflet_id' of undefined leaflet.js
 * When calling vectortilelayer, it throws an error.
 * https://github.com/slutske22/react-esri-leaflet/issues/22
 */

L.Map.include({
    removeLayer(layer) {
      if (!layer) return this;
  
      const id = L.Util.stamp(layer);
  
      if (!this._layers[id]) {
        return this;
      }
  
      if (this._loaded) {
        layer.onRemove(this);
      }
  
      delete this._layers[id];
  
      if (this._loaded) {
        this.fire("layerremove", { layer });
        layer.fire("remove");
      }
  
      // @ts-expect-error leaflet TS very incomplete
      layer._map = layer._mapToAdd = null;
  
      return this;
    },
  });