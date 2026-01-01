// ==========================================
// متغیرهای سراسری (Global Variables)
// ==========================================
let gl = null;           // کانتکست WebGL
let session = null;      // نشست AR
let xrRefSpace = null;   // فضای مختصات AR
let glLayer = null;      // لایه رندر WebXR

// آبجکت‌های LiteGL
let mesh = null;         // صفحه سه بعدی (Plane)
let texture = null;      // تصویر یا ویدیو
let shader = null;       // شیدر برای نمایش تکسچر

// وضعیت مدیا
let videoElement = document.getElementById("video-hidden");
let isVideo = false;
let mediaAspectRatio = 1.0; // نسبت تصویر برای جلوگیری از دفرمه شدن

// ==========================================
// 1. تنظیمات اولیه و انتخاب فایل
// ==========================================

// وقتی کاربر فایلی انتخاب می‌کند
document.getElementById('fileInput').addEventListener('change', handleFileSelect);

// وقتی دکمه شروع زده می‌شود
document.getElementById('startAR').addEventListener('click', startAR);

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const status = document.getElementById('status');
    const startBtn = document.getElementById('startAR');

    // تشخیص نوع فایل (ویدیو یا عکس)
    if (file.type.startsWith('video')) {
        isVideo = true;
        videoElement.src = url;
        videoElement.onloadedmetadata = () => {
            status.textContent = "ویدیو بارگذاری شد. دکمه شروع را بزنید.";
            startBtn.disabled = false;
            mediaAspectRatio = videoElement.videoWidth / videoElement.videoHeight;
        };
    } else if (file.type.startsWith('image')) {
        isVideo = false;
        const img = new Image();
        img.src = url;
        img.onload = () => {
            status.textContent = "عکس بارگذاری شد. دکمه شروع را بزنید.";
            startBtn.disabled = false;
            mediaAspectRatio = img.width / img.height;
            // ساخت تکسچر لایت‌جی‌ال از عکس
            // نکته: کانتکست GL هنوز ساخته نشده، این کار را در startAR انجام می‌دهیم
            window.tempImage = img; 
        };
    }
}

// ==========================================
// 2. راه‌اندازی WebGL و LiteGL
// ==========================================

function initLiteGL() {
    if (gl) return; // اگر قبلا ساخته شده، دوباره نساز

    // ساخت کانتکست با قابلیت Alpha (شفافیت) برای AR ضروری است
    // - اشاره به ساخت کانتکست در داکیومنت
    gl = GL.create({
        alpha: true,
        preserveDrawingBuffer: false,
        xrCompatible: true // اجازه می‌دهد با WebXR کار کند
    });

    // اضافه کردن بوم (Canvas) به صفحه
    document.body.appendChild(gl.canvas);

    // ساخت یک صفحه (Mesh) ساده
    // - استفاده از متد Mesh.plane
    mesh = GL.Mesh.plane({ size: 1, detail: 1 });

    // تعریف شیدر (Shader)
    // ورتکس شیدر: موقعیت را محاسبه می‌کند
    // فرگمنت شیدر: رنگ را از تکسچر می‌خواند
    shader = new GL.Shader(
        // Vertex Shader
        `precision highp float;
        attribute vec3 a_vertex;
        attribute vec2 a_coord;
        varying vec2 v_coord;
        uniform mat4 u_mvp;
        void main() {
            v_coord = a_coord;
            gl_Position = u_mvp * vec4(a_vertex, 1.0);
        }`,
        // Fragment Shader
        `precision highp float;
        varying vec2 v_coord;
        uniform sampler2D u_texture;
        void main() {
            gl_FragColor = texture2D(u_texture, v_coord);
        }`
    );
}

// ==========================================
// 3. منطق WebXR (واقعیت افزوده)
// ==========================================

async function startAR() {
    // بررسی پشتیبانی مرورگر
    if (!navigator.xr) {
        alert("WebXR پشتیبانی نمی‌شود. لطفا از کروم اندروید استفاده کنید.");
        return;
    }

    // مقداردهی اولیه LiteGL
    initLiteGL();

    // ساخت تکسچر نهایی
    if (isVideo) {
        // - استفاده از fromVideo
        texture = GL.Texture.fromVideo(videoElement, { minFilter: gl.LINEAR, magFilter: gl.LINEAR });
    } else if (window.tempImage) {
        // - استفاده از fromImage
        texture = GL.Texture.fromImage(window.tempImage, { minFilter: gl.LINEAR, magFilter: gl.LINEAR });
    }

    // مخفی کردن منوی HTML
    document.getElementById('overlay').style.display = 'none';

    try {
        // درخواست نشست AR
        session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['local']
        });

        // تنظیم لایه رندر WebGL برای نشست AR
        glLayer = new XRWebGLLayer(session, gl);
        session.updateRenderState({ baseLayer: glLayer });

        // دریافت سیستم مختصات محلی (Local)
        xrRefSpace = await session.requestReferenceSpace('local');

        // مدیریت پایان نشست
        session.addEventListener('end', onSessionEnded);

        // اگر ویدیو است، پخش کن
        if (isVideo) videoElement.play();

        // شروع حلقه رندر
        session.requestAnimationFrame(onXRFrame);

    } catch (e) {
        alert("خطا در شروع AR: " + e.message);
        console.error(e);
        document.getElementById('overlay').style.display = 'flex';
    }
}

function onSessionEnded() {
    session = null;
    if (isVideo) videoElement.pause();
    document.getElementById('overlay').style.display = 'flex';
}

// ==========================================
// 4. حلقه رندر (Render Loop)
// ==========================================

function onXRFrame(time, frame) {
    // درخواست فریم بعدی
    session.requestAnimationFrame(onXRFrame);

    // دریافت موقعیت کاربر (گوشی) در فضا
    const pose = frame.getViewerPose(xrRefSpace);

    if (pose) {
        // اتصال به بافر خروجی WebXR
        const layer = session.renderState.baseLayer;
        gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);

        // پاک کردن صفحه (بسیار مهم: باید شفاف باشد تا دوربین دیده شود)
        gl.clearColor(0, 0, 0, 0); 
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // آپدیت کردن تکسچر اگر ویدیو در حال پخش است
        // - استفاده از uploadImage برای به‌روزرسانی فریم ویدیو
        if (isVideo && texture && videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
            texture.uploadImage(videoElement);
        }

        // رندر کردن برای هر "چشم" (در موبایل معمولا یکی است)
        for (const view of pose.views) {
            const viewport = layer.getViewport(view);
            gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

            // -- محاسبات ماتریس --
            
            // 1. ماتریس تصویر (View Matrix) و پروجکشن (Projection Matrix) از WebXR می‌آیند
            const projectionMatrix = view.projectionMatrix;
            const viewMatrix = view.transform.inverse.matrix;

            // 2. ماتریس مدل (Model Matrix): مکان و اندازه عکس در دنیای واقعی
            const modelMatrix = mat4.create();
            
            // انتقال عکس به 2 متر جلوتر (z = -2)
            mat4.translate(modelMatrix, modelMatrix, [0, 0, -2]);
            
            // تنظیم نسبت تصویر (Aspect Ratio) تا عکس کشیده نشود
            // اگر عکس افقی است، عرض را بیشتر می‌کنیم، اگر عمودی، ارتفاع را
            if (mediaAspectRatio > 1) {
                mat4.scale(modelMatrix, modelMatrix, [mediaAspectRatio, 1, 1]);
            } else {
                mat4.scale(modelMatrix, modelMatrix, [1, 1 / mediaAspectRatio, 1]);
            }

            // 3. محاسبه ماتریس نهایی MVP (Model-View-Projection)
            const viewProjectionMatrix = mat4.create();
            mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);
            
            const mvp = mat4.create();
            mat4.multiply(mvp, viewProjectionMatrix, modelMatrix);

            // -- رسم کردن با LiteGL --
            if (texture && mesh && shader) {
                // فعال کردن تکسچر در اسلات 0
                texture.bind(0);
                
                // ارسال Uniformها به شیدر و دستور رسم
                shader.uniforms({
                    u_mvp: mvp,
                    u_texture: 0
                }).draw(mesh);
            }
        }
    }
}