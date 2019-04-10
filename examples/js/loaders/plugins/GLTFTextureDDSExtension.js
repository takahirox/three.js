THREE.GLTFTextureDDSExtension = ( function () {

	var Plugin = THREE.GLTFLoader.Plugin;

	/**
	 * DDS Texture Extension
	 *
	 * Specification:
	 * https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/MSFT_texture_dds
	 *
	 */
	function GLTFTextureDDSExtension( ddsLoader ) {

		Plugin.call( this, 'MSFT_texture_dds' );

		this.ddsLoader = ddsLoader;

	}

	GLTFTextureDDSExtension.prototype = Object.assign( Object.create( Plugin.prototype ), {

		constructor: GLTFTextureDDSExtension,

		onTexture: function ( textureDef, parser ) {

			var extensions = textureDef.extensions;

			if ( ! extensions || ! extensions[ this.name ] ) return null;

			var json = parser.json;
			var source = json.images[ extensions[ this.name ].source ];
			var loader = this.ddsLoader;

			return parser.loadTextureFile( source, loader );

		}

	} );

	return GLTFTextureDDSExtension;

} )();
