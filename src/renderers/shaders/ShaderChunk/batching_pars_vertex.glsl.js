export default /* glsl */`
#ifdef USE_BATCHING

	uniform highp sampler2D batchingTexture;
	uniform int batchingTextureSize;

	mat4 getBatchingMatrix( const in float i ) {

		float j = i * 4.0;
		float x = mod( j, float( batchingTextureSize ) );
		float y = floor( j / float( batchingTextureSize ) );

		float dx = 1.0 / float( batchingTextureSize );
		float dy = 1.0 / float( batchingTextureSize );

		y = dy * ( y + 0.5 );

		vec4 v1 = texture2D( batchingTexture, vec2( dx * ( x + 0.5 ), y ) );
		vec4 v2 = texture2D( batchingTexture, vec2( dx * ( x + 1.5 ), y ) );
		vec4 v3 = texture2D( batchingTexture, vec2( dx * ( x + 2.5 ), y ) );
		vec4 v4 = texture2D( batchingTexture, vec2( dx * ( x + 3.5 ), y ) );

		mat4 bone = mat4( v1, v2, v3, v4 );

		return bone;

	}

#endif
`;
