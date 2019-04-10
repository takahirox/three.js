THREE.GLTFTextureWebPExtension = ( function () {

	var Plugin = THREE.GLTFLoader.Plugin;

	/**
	 * WebP Texture Extension
	 *
	 * Specification:
	 * https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_texture_webp
	 *
	 */
	function GLTFTextureWebPExtension() {

		Plugin.call( this, 'EXT_texture_webp' );

	}

	GLTFTextureWebPExtension.prototype = Object.assign( Object.create( Plugin.prototype ), {

		constructor: GLTFTextureWebPExtension,

		onTexture: function ( textureDef, parser ) {

			var extensions = textureDef.extensions;

			if ( ! extensions || ! extensions[ this.name ] ) return null;

			return parser.loadTextureFile( parser.json.images[ extensions[ this.name ].source ] );

		}

	} );

	return GLTFTextureWebPExtension;

} )();
