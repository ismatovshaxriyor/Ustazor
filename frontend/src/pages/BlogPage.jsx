import { blogPosts } from '../data/mockData';

function BlogPage() {
  return (
    <section className="stack-medium">
      <div className="section-heading reveal-up">
        <p className="eyebrow">ustazor blog</p>
        <h1>Qo'llanmalar va amaliy maslahatlar</h1>
      </div>

      <div className="blog-grid reveal-up delay-1">
        {blogPosts.map((post) => (
          <article key={post.id} className="listing-card blog-card">
            <p className="pill">{post.category}</p>
            <h3>{post.title}</h3>
            <p>{post.excerpt}</p>
            <p className="muted">{post.dateLabel}</p>
            <button className="button button-ghost" type="button">
              O'qishni davom etish
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default BlogPage;
