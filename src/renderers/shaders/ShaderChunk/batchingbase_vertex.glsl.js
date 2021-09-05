export default /* glsl */`
#ifdef USE_BATCHING

	// @TODO: Support non multidraw platform
	mat4 batchingMatrix = getBatchingMatrix( float( gl_DrawID ) );

#endif
`;
