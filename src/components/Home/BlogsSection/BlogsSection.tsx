import React from "react";
import styles from "./BlogsSection.module.css";
import { useHistory } from "react-router-dom";
import { useNewsList } from "../../News/data/useNewsList";

const BlogsSection = () => {
  const history = useHistory();
  const { articles, loading } = useNewsList();

  // Show max 3 articles; prefer featured ones first
  const sorted = [
    ...articles.filter((a) => a.isFeatured),
    ...articles.filter((a) => !a.isFeatured),
  ].slice(0, 3);

if (loading || sorted.length === 0) return null;

  return (
    <div className={styles.main}>
      <div className={styles.MainContainer}>
        <div className={styles.Top}>
          <h3>From White Mantis</h3>
          <p onClick={() => history.push("/News")}>View all</p>
        </div>

        <div className={styles.Bottom}>
        

          {!loading && sorted.map((blog) => (
            <div className={styles.BlogCard} key={blog.id}>
              <div className={styles.BlogCardTop}>
                <div className={styles.BlogImage}>
                  <img src={blog.image} alt={blog.title} />
                </div>

                {blog.isFeatured && (
                  <div className={styles.BlogFeaturedBadge}>
                    <p>Featured</p>
                  </div>
                )}
              </div>

              <div className={styles.BlogCardBottom}>
                <h3>{blog.title}</h3>

                <div
                  className={styles.BlogCardBottomDetails}
                  onClick={() => history.push(`/news/${blog.id}`)}
                >
                  <p>Read Article</p>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7 6L11 10L7 14"
                      stroke="#6C7A5F"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlogsSection;