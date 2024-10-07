(function () {
  // 背景選項輪播
  const bgSlider = new Swiper('[data-slider-bg]', {
    loop: false,
    slidesPerView: 'auto',
    centeredSlides: true,
    navigation: {
      nextEl: '.-bg .swiper-button-next',
      prevEl: '.-bg .swiper-button-prev'
    },
    on: {
      slideChangeTransitionEnd: function () {
        $(`[data-card-bg="${this.activeIndex + 1}"]`).prop('checked', true).trigger('change.bg');
      }
    }
  });

  // 背景切換
  $('[data-card-bg]').on('change.bg', function (e) {
    $('.card').addClass('-loading');
    const val = $(e.target).data('cardBg');
    const img = new Image();
    img.src = `./assets/image/card/${val}.jpg`;
    img.onload = () => {
      if ($('.card').hasClass('-loading')) {
        $('.card-bg img').attr('src', `./assets/image/card/${val}.jpg`);
        setTimeout(() => {
          $('.card').removeClass('-loading');
        }, 0);
      }
    };
  });
  $('[data-card-bg]').on('change.slide', function (e) {
    const val = $(e.target).data('cardBg');
    bgSlider.slideTo(val - 1);
  });
})();